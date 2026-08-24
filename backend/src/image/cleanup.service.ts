import { findAssetsByProjectAndStatus, updateAsset } from '../repositories/asset.repository.js';
import { findRegionsByAssetId, updateRegionCleanupMetadata } from '../repositories/ocr.repository.js';
import { updateProjectStage } from '../repositories/project.repository.js';
import { downloadFromStorage, uploadToStorage } from '../repositories/storage.repository.js';
import type { AssetRow } from '../types/asset.js';
import type { CleanupResult } from '../types/cleanup.js';
import { AppError, describeError } from '../errors/app-error.js';
import { env } from '../config/env.js';
import { decodeImagePixels, sampleBorderPixelsFromDecoded, sampleTextColorFromDecoded } from './background-sampler.js';
import { assessCleanupQuality, decideCleanupMethod } from './cleanup-quality.js';
import { applySolidColorCleanup } from './solid-color-cleanup.js';
import { applyTransparentCleanup } from './transparent-cleanup.js';
import { applyDirectionalInpaint } from './directional-inpaint.js';
import { applyBlurCleanup } from './blur-cleanup.js';
import { generateTextEraseMask } from './mask-generator.js';
import { isMaskCoverageSafe, measureMaskCoverage } from './mask-coverage.js';
import { mapWithConcurrency } from '../utils/concurrency.js';
import { generateAdaptiveTextMask } from './adaptive-text-mask.js';
import { logger } from '../config/logger.js';

const METHOD_PRIORITY: CleanupResult['method'][] = [
  'manual-required',
  'blur-mask',
  'directional-inpaint',
  'solid-color-fill',
  'transparent-mask',
];

function aggregateMethod(methods: CleanupResult['method'][]): CleanupResult['method'] {
  return METHOD_PRIORITY.find((method) => methods.includes(method)) ?? 'manual-required';
}

export async function runCleanupForAsset(asset: AssetRow): Promise<CleanupResult & { assetId: string }> {
  if (!asset.original_path || !asset.width || !asset.height) {
    const errorMessage = '업로드 검증이 완료되지 않은 이미지입니다.';
    await updateAsset(asset.id, { status: 'failed', stage: 'cleaning', errorCode: 'UPLOAD_NOT_COMPLETED', errorMessage });
    return { assetId: asset.id, method: 'manual-required', quality: 'low', needsManualCleanup: true };
  }

  const regions = (await findRegionsByAssetId(asset.id)).filter((region) => region.contains_korean);
  if (regions.length === 0) {
    const errorMessage = '정리할 한국어 OCR 영역을 찾을 수 없습니다.';
    await updateAsset(asset.id, { status: 'failed', stage: 'cleaning', errorCode: 'OCR_TEXT_NOT_FOUND', errorMessage });
    return { assetId: asset.id, method: 'manual-required', quality: 'low', needsManualCleanup: true };
  }
  try {
    const buffer = await downloadFromStorage(asset.original_path);
    if (!buffer) {
      throw new AppError('IMAGE_CLEANUP_FAILED', undefined, '원본 이미지를 스토리지에서 찾을 수 없습니다.');
    }

    const decoded = await decodeImagePixels(buffer);
    let cleanedBuffer = buffer;
    const methods: CleanupResult['method'][] = [];
    const qualities: CleanupResult['quality'][] = [];
    let needsManualCleanup = false;
    let primaryTextColor: { r: number; g: number; b: number } | null = null;

    for (const region of regions) {
      if (region.needs_manual_review) {
        needsManualCleanup = true;
        methods.push('manual-required');
        qualities.push('low');
        await updateRegionCleanupMetadata(region.id, { textColor: null, needsManualCleanup: true });
        continue;
      }
      try {
        const stats = sampleBorderPixelsFromDecoded(decoded, region.bbox);
        const textColor = sampleTextColorFromDecoded(decoded, region.bbox, stats.medianColor);
        if (region.is_primary || primaryTextColor === null) primaryTextColor = textColor;
        let method = decideCleanupMethod(stats);
        let quality = assessCleanupQuality(method, stats);
        let mask;

        if (method === 'directional-inpaint') {
          const adaptive = await generateAdaptiveTextMask(decoded, region.bbox);
          mask = adaptive.mask;
          if (adaptive.confidence < 0.55 || !isMaskCoverageSafe(measureMaskCoverage(mask))) {
            method = 'blur-mask';
            quality = 'acceptable';
          }
        } else {
          mask = await generateTextEraseMask(
            buffer,
            region.bbox,
            asset.width,
            asset.height,
            method === 'transparent-mask'
              ? { mode: 'transparent' }
              : { mode: 'solid', backgroundColor: stats.medianColor },
            decoded,
          );
          if (!isMaskCoverageSafe(measureMaskCoverage(mask))) {
            method = 'blur-mask';
            quality = 'acceptable';
          }
        }

        cleanedBuffer = method === 'blur-mask'
          ? await applyBlurCleanup(cleanedBuffer, region.bbox, asset.width, asset.height)
          : method === 'transparent-mask'
            ? await applyTransparentCleanup(cleanedBuffer, region.bbox, asset.width, asset.height, mask)
            : method === 'directional-inpaint'
              ? await applyDirectionalInpaint(cleanedBuffer, region.bbox, asset.width, asset.height, mask)
              : await applySolidColorCleanup(cleanedBuffer, region.bbox, stats.medianColor, asset.width, asset.height, mask);
        methods.push(method);
        qualities.push(quality);
        await updateRegionCleanupMetadata(region.id, { textColor, needsManualCleanup: false });
      } catch (error) {
        logger.warn({ err: error, assetId: asset.id, regionId: region.id }, 'OCR 영역 자동 정리 실패 — 다른 영역은 계속 처리합니다.');
        needsManualCleanup = true;
        methods.push('manual-required');
        qualities.push('low');
        await updateRegionCleanupMetadata(region.id, { textColor: null, needsManualCleanup: true });
      }
    }

    const cleanedPath = `projects/${asset.project_id}/cleaned/${asset.id}.png`;
    const hasAutomaticCleanup = methods.some((method) => method !== 'manual-required');
    if (hasAutomaticCleanup) await uploadToStorage(cleanedPath, cleanedBuffer, 'image/png');

    const method = aggregateMethod(methods);
    const quality: CleanupResult['quality'] = qualities.includes('low')
      ? 'low'
      : qualities.includes('acceptable') ? 'acceptable' : 'good';

    await updateAsset(asset.id, {
      status: 'completed',
      stage: 'cleaning',
      progress: 100,
      cleanedPath: hasAutomaticCleanup ? cleanedPath : null,
      cleanupMethod: method,
      cleanupQuality: quality,
      needsManualCleanup,
      textColor: primaryTextColor,
    });

    return {
      assetId: asset.id,
      method,
      quality,
      needsManualCleanup,
      ...(hasAutomaticCleanup ? { cleanedImagePath: cleanedPath } : {}),
    };
  } catch (err) {
    const { code: errorCode, message: errorMessage } = describeError(err, 'IMAGE_CLEANUP_FAILED', '이미지 정리 중 알 수 없는 오류가 발생했습니다.');
    await updateAsset(asset.id, { status: 'failed', stage: 'cleaning', errorCode, errorMessage });
    return { assetId: asset.id, method: 'manual-required', quality: 'low', needsManualCleanup: true };
  }
}

export async function runProjectCleanup(projectId: string): Promise<Array<CleanupResult & { assetId: string }>> {
  const assets = await findAssetsByProjectAndStatus(projectId, ['translating']);
  await updateProjectStage(projectId, { status: 'processing', stage: 'cleaning' });

  const results = await mapWithConcurrency(assets, env.CLEANUP_CONCURRENCY, runCleanupForAsset);

  return results;
}
