import { findAssetsByProjectAndStatus, updateAsset } from '../repositories/asset.repository.js';
import { findRegionsByAssetId, updateRegionCleanupMetadata } from '../repositories/ocr.repository.js';
import { findProjectById, updateProjectStage } from '../repositories/project.repository.js';
import { findTranslationsByOcrRegionIds } from '../repositories/translation.repository.js';
import { downloadFromStorage, uploadToStorage } from '../repositories/storage.repository.js';
import type { AssetRow } from '../types/asset.js';
import type { CleanupResult } from '../types/cleanup.js';
import { AppError, describeError } from '../errors/app-error.js';
import { env } from '../config/env.js';
import { decodeImagePixels, sampleBorderPixelsFromDecoded, sampleTextColorFromDecoded } from './background-sampler.js';
import { assessCleanupQuality, decideCleanupMethod } from './cleanup-quality.js';
import { applySolidColorCleanup } from './solid-color-cleanup.js';
import { applyTransparentCleanup } from './transparent-cleanup.js';
import { generateTextEraseMask } from './mask-generator.js';
import { isMaskCoverageSafe, measureMaskCoverage } from './mask-coverage.js';
import { mapWithConcurrency } from '../utils/concurrency.js';
import { logger } from '../config/logger.js';
import { generateAdaptiveTextMask } from './adaptive-text-mask.js';
import { applyDirectionalInpaint } from './directional-inpaint.js';

const ADAPTIVE_MASK_MIN_CONFIDENCE = 0.55;

const METHOD_PRIORITY: CleanupResult['method'][] = [
  'manual-required',
  'directional-inpaint',
  'blur-mask',
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
    const project = await findProjectById(asset.project_id);
    if (!project) throw new AppError('PROJECT_NOT_FOUND', { projectId: asset.project_id });
    const translations = await findTranslationsByOcrRegionIds(regions.map((region) => region.id));
    const translatedLanguagesByRegion = new Map<string, Set<string>>();
    for (const translation of translations) {
      const languages = translatedLanguagesByRegion.get(translation.ocr_region_id) ?? new Set<string>();
      languages.add(translation.language_code);
      translatedLanguagesByRegion.set(translation.ocr_region_id, languages);
    }
    let cleanedBuffer = buffer;
    const methods: CleanupResult['method'][] = [];
    const qualities: CleanupResult['quality'][] = [];
    let needsManualCleanup = false;
    let primaryTextColor: { r: number; g: number; b: number } | null = null;

    for (const region of regions) {
      const translatedLanguages = translatedLanguagesByRegion.get(region.id) ?? new Set<string>();
      const isTranslationComplete = project.target_languages.every((languageCode) => translatedLanguages.has(languageCode));
      if (!isTranslationComplete) {
        // 번역문이 준비되지 않은 영역을 먼저 지우면 미리보기에 빈 공간만 남는다.
        // OCR 검수 상태와 cleanup 안전성은 별개이므로 수동 cleanup 대상으로 표시하지 않는다.
        await updateRegionCleanupMetadata(region.id, { textColor: null, needsManualCleanup: false });
        continue;
      }
      if (region.needs_manual_review) {
        // OCR 문구나 좌표가 확정되지 않은 상태에서 자동 삭제하면 반복 장식 문구·캐릭터를
        // 일부만 지우는 비가역적 결과가 생긴다. 원본을 보존하고 에디터 검수로 넘긴다.
        needsManualCleanup = true;
        methods.push('manual-required');
        qualities.push('low');
        await updateRegionCleanupMetadata(region.id, { textColor: null, needsManualCleanup: true });
        continue;
      }
      try {
        const stats = sampleBorderPixelsFromDecoded(decoded, region.bbox);
        const method = decideCleanupMethod(stats);
        const quality = assessCleanupQuality(method, stats);
        if (method === 'directional-inpaint') {
          const adaptive = await generateAdaptiveTextMask(decoded, region.bbox);
          const adaptiveSafe = adaptive.confidence >= ADAPTIVE_MASK_MIN_CONFIDENCE
            && isMaskCoverageSafe(measureMaskCoverage(adaptive.mask));
          // 로컬 명암 기반 마스크가 두꺼운 글자·작은 이미지에서 실패하면 배경 대표색과
          // 다른 연결성분 마스크를 보조 후보로 검사한다. 둘 다 안전하지 않으면 원본 보존.
          const colorMask = adaptiveSafe ? null : await generateTextEraseMask(
            buffer,
            region.bbox,
            asset.width,
            asset.height,
            { mode: 'solid', backgroundColor: stats.medianColor },
            decoded,
          );
          const selectedMask = adaptiveSafe
            ? adaptive.mask
            : colorMask && isMaskCoverageSafe(measureMaskCoverage(colorMask)) ? colorMask : null;
          const textColor = sampleTextColorFromDecoded(decoded, region.bbox, stats.medianColor, selectedMask ?? adaptive.mask);
          if (region.is_primary || primaryTextColor === null) primaryTextColor = textColor;
          if (!selectedMask) {
            needsManualCleanup = true;
            methods.push('manual-required');
            qualities.push('low');
            await updateRegionCleanupMetadata(region.id, { textColor, needsManualCleanup: true });
            continue;
          }

          cleanedBuffer = await applyDirectionalInpaint(
            cleanedBuffer,
            region.bbox,
            asset.width,
            asset.height,
            selectedMask,
          );
          methods.push(method);
          qualities.push(quality);
          await updateRegionCleanupMetadata(region.id, { textColor, needsManualCleanup: false });
          continue;
        }

        const mask = await generateTextEraseMask(
          buffer,
          region.bbox,
          asset.width,
          asset.height,
          method === 'transparent-mask'
            ? { mode: 'transparent' }
            : { mode: 'solid', backgroundColor: stats.medianColor },
          decoded,
        );
        const textColor = sampleTextColorFromDecoded(decoded, region.bbox, stats.medianColor, mask);
        if (region.is_primary || primaryTextColor === null) primaryTextColor = textColor;
        if (!isMaskCoverageSafe(measureMaskCoverage(mask))) {
          // 마스크가 비정상이면 단색 배경이어도 OCR 사각형 전체를 덮지 않는다. 잘못 잡힌
          // 박스가 캐릭터/말풍선 윤곽을 영구적으로 지우는 것보다 원본 보존 + 수동 검수가 안전하다.
          needsManualCleanup = true;
          methods.push('manual-required');
          qualities.push('low');
          await updateRegionCleanupMetadata(region.id, { textColor, needsManualCleanup: true });
          continue;
        }

        cleanedBuffer = method === 'transparent-mask'
          ? await applyTransparentCleanup(cleanedBuffer, region.bbox, asset.width, asset.height, mask)
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
