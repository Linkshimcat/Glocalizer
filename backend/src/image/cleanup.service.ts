import { findAssetsByProjectAndStatus, updateAsset } from '../repositories/asset.repository.js';
import { findPrimaryRegion } from '../repositories/ocr.repository.js';
import { updateProjectStage } from '../repositories/project.repository.js';
import { downloadFromStorage, uploadToStorage } from '../repositories/storage.repository.js';
import type { AssetRow } from '../types/asset.js';
import type { CleanupResult } from '../types/cleanup.js';
import { AppError, describeError } from '../errors/app-error.js';
import { env } from '../config/env.js';
import { sampleBorderPixels } from './background-sampler.js';
import { assessCleanupQuality, decideCleanupMethod } from './cleanup-quality.js';
import { applySolidColorCleanup } from './solid-color-cleanup.js';
import { applyTransparentCleanup } from './transparent-cleanup.js';
import { generateTextEraseMask } from './mask-generator.js';
import { isMaskCoverageSafe, measureMaskCoverage } from './mask-coverage.js';
import { mapWithConcurrency } from '../utils/concurrency.js';

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
      });
      return { assetId: asset.id, method: 'manual-required', quality: 'low', needsManualCleanup: true };
    }

    const cleanedBuffer =
      method === 'transparent-mask'
        ? await applyTransparentCleanup(buffer, region.bbox, asset.width, asset.height, mask)
        : await applySolidColorCleanup(buffer, region.bbox, stats.medianColor, asset.width, asset.height, mask);

    const cleanedPath = `projects/${asset.project_id}/cleaned/${asset.id}.png`;
    await uploadToStorage(cleanedPath, cleanedBuffer, 'image/png');

    await updateAsset(asset.id, {
      status: 'completed',
      stage: 'cleaning',
      progress: 100,
      cleanedPath,
      cleanupMethod: method,
      cleanupQuality: quality,
      needsManualCleanup: false,
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
