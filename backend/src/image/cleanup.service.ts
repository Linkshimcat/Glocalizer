import { findAssetsByProjectAndStatus, updateAsset } from '../repositories/asset.repository.js';
import { findPrimaryRegion, findRegionsByAssetId } from '../repositories/ocr.repository.js';
import { updateProjectStage } from '../repositories/project.repository.js';
import { downloadFromStorage, uploadToStorage } from '../repositories/storage.repository.js';
import type { AssetRow } from '../types/asset.js';
import type { CleanupResult } from '../types/cleanup.js';
import { AppError, describeError } from '../errors/app-error.js';
import { env } from '../config/env.js';
import { sampleBorderPixels, sampleTextColor } from './background-sampler.js';
import { assessCleanupQuality, decideCleanupMethod } from './cleanup-quality.js';
import { applySolidColorCleanup } from './solid-color-cleanup.js';
import { applyTransparentCleanup } from './transparent-cleanup.js';
import { applyDirectionalInpaint } from './directional-inpaint.js';
import { generateTextEraseMask } from './mask-generator.js';
import { isMaskCoverageSafe, measureMaskCoverage } from './mask-coverage.js';
import { mapWithConcurrency } from '../utils/concurrency.js';

// 대표 영역 외에 감지된 다른 한글 영역(여러 텍스트 블록·긴 문장의 나머지 줄)도 함께 지운다.
// 각 영역을 독립적으로 판단해, 안전한 것만 버퍼에 순차 적용하고 위험한 것은 그대로 둔다.
async function eraseAdditionalRegions(
  buffer: Buffer,
  assetId: string,
  primaryRegionId: string,
  width: number,
  height: number,
): Promise<Buffer> {
  const regions = await findRegionsByAssetId(assetId);
  let merged = buffer;
  for (const region of regions) {
    if (region.id === primaryRegionId) continue;
    if (region.needs_manual_review) continue;
    if (!region.contains_korean) continue;
    if (!region.detected_text || !region.detected_text.trim()) continue;

    const stats = await sampleBorderPixels(merged, region.bbox, width, height);
    const method = decideCleanupMethod(stats);
    const quality = assessCleanupQuality(method, stats);
    if (method === 'manual-required' || quality === 'low') continue;

    const mask = await generateTextEraseMask(
      merged,
      region.bbox,
      width,
      height,
      method === 'transparent-mask'
        ? { mode: 'transparent' }
        : { mode: 'solid', backgroundColor: stats.medianColor },
    );
    if (!isMaskCoverageSafe(measureMaskCoverage(mask))) continue;

    merged =
      method === 'transparent-mask'
        ? await applyTransparentCleanup(merged, region.bbox, width, height, mask)
        : method === 'directional-inpaint'
          ? await applyDirectionalInpaint(merged, region.bbox, width, height, mask)
          : await applySolidColorCleanup(merged, region.bbox, stats.medianColor, width, height, mask);
  }
  return merged;
}

export async function runCleanupForAsset(asset: AssetRow): Promise<CleanupResult & { assetId: string }> {
  if (!asset.original_path || !asset.width || !asset.height) {
    const errorMessage = '업로드 검증이 완료되지 않은 이미지입니다.';
    await updateAsset(asset.id, { status: 'failed', stage: 'cleaning', errorCode: 'UPLOAD_NOT_COMPLETED', errorMessage });
    return { assetId: asset.id, method: 'manual-required', quality: 'low', needsManualCleanup: true };
  }

  const region = await findPrimaryRegion(asset.id);
  if (!region) {
    const errorMessage = '대표 OCR 영역을 찾을 수 없어 이미지를 정리할 수 없습니다.';
    await updateAsset(asset.id, { status: 'failed', stage: 'cleaning', errorCode: 'OCR_TEXT_NOT_FOUND', errorMessage });
    return { assetId: asset.id, method: 'manual-required', quality: 'low', needsManualCleanup: true };
  }
  if (region.needs_manual_review) {
    await updateAsset(asset.id, { status: 'completed', stage: 'ocr-review', progress: 100, cleanupMethod: 'manual-required', cleanupQuality: 'low', needsManualCleanup: true });
    return { assetId: asset.id, method: 'manual-required', quality: 'low', needsManualCleanup: true };
  }

  try {
    const buffer = await downloadFromStorage(asset.original_path);
    if (!buffer) {
      throw new AppError('IMAGE_CLEANUP_FAILED', undefined, '원본 이미지를 스토리지에서 찾을 수 없습니다.');
    }

    const stats = await sampleBorderPixels(buffer, region.bbox, asset.width, asset.height);
    // 배경색을 기준으로 원본 글자색을 추정해 번역 텍스트 기본 색으로 쓴다(감지 실패 시 null).
    const textColor = await sampleTextColor(buffer, region.bbox, asset.width, asset.height, stats.medianColor);
    const method = decideCleanupMethod(stats);
    const quality = assessCleanupQuality(method, stats);

    // 불확실한 단색 추정으로 캐릭터·말풍선까지 지우는 것보다 editor의 수동 보정이 안전하다.
    if (method === 'manual-required' || quality === 'low') {
      await updateAsset(asset.id, {
        status: 'completed',
        stage: 'cleaning',
        progress: 100,
        cleanupMethod: 'manual-required',
        cleanupQuality: quality,
        needsManualCleanup: true,
        textColor,
      });
      return { assetId: asset.id, method: 'manual-required', quality, needsManualCleanup: true };
    }

    const mask = await generateTextEraseMask(
      buffer,
      region.bbox,
      asset.width,
      asset.height,
      method === 'transparent-mask'
        ? { mode: 'transparent' }
        : { mode: 'solid', backgroundColor: stats.medianColor },
    );
    if (!isMaskCoverageSafe(measureMaskCoverage(mask))) {
      await updateAsset(asset.id, {
        status: 'completed',
        stage: 'cleaning',
        progress: 100,
        cleanupMethod: 'manual-required',
        cleanupQuality: 'low',
        needsManualCleanup: true,
        textColor,
      });
      return { assetId: asset.id, method: 'manual-required', quality: 'low', needsManualCleanup: true };
    }

    const cleanedBuffer =
      method === 'transparent-mask'
        ? await applyTransparentCleanup(buffer, region.bbox, asset.width, asset.height, mask)
        : method === 'directional-inpaint'
          ? await applyDirectionalInpaint(buffer, region.bbox, asset.width, asset.height, mask)
          : await applySolidColorCleanup(buffer, region.bbox, stats.medianColor, asset.width, asset.height, mask);

    // 대표 영역 외 다른 한글 영역도 안전하면 함께 지운다(여러 블록·긴 문장 대응).
    const mergedBuffer = await eraseAdditionalRegions(cleanedBuffer, asset.id, region.id, asset.width, asset.height);

    const cleanedPath = `projects/${asset.project_id}/cleaned/${asset.id}.png`;
    await uploadToStorage(cleanedPath, mergedBuffer, 'image/png');

    await updateAsset(asset.id, {
      status: 'completed',
      stage: 'cleaning',
      progress: 100,
      cleanedPath,
      cleanupMethod: method,
      cleanupQuality: quality,
      needsManualCleanup: false,
      textColor,
    });

    return { assetId: asset.id, method, quality, needsManualCleanup: false, cleanedImagePath: cleanedPath };
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
