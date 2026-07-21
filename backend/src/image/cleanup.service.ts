import { findAssetsByProjectAndStatus, updateAsset } from '../repositories/asset.repository.js';
import { findRegionsByAssetId } from '../repositories/ocr.repository.js';
import { updateProjectStage } from '../repositories/project.repository.js';
import { downloadFromStorage, uploadToStorage } from '../repositories/storage.repository.js';
import type { AssetRow } from '../types/asset.js';
import type { CleanupResult } from '../types/cleanup.js';
import { AppError, describeError } from '../errors/app-error.js';
import { sampleBorderPixels } from './background-sampler.js';
import { assessCleanupQuality, decideCleanupMethod } from './cleanup-quality.js';
import { applySolidColorCleanup } from './solid-color-cleanup.js';
import { applyTransparentCleanup } from './transparent-cleanup.js';

export async function runCleanupForAsset(asset: AssetRow): Promise<CleanupResult & { assetId: string }> {
  if (!asset.original_path || !asset.width || !asset.height) {
    const errorMessage = '업로드 검증이 완료되지 않은 이미지입니다.';
    await updateAsset(asset.id, { status: 'failed', stage: 'cleaning', errorCode: 'UPLOAD_NOT_COMPLETED', errorMessage });
    return { assetId: asset.id, method: 'manual-required', quality: 'low', needsManualCleanup: true };
  }

  const regions = await findRegionsByAssetId(asset.id);
  if (regions.length === 0) {
    const errorMessage = 'OCR 영역을 찾을 수 없어 이미지를 정리할 수 없습니다.';
    await updateAsset(asset.id, { status: 'failed', stage: 'cleaning', errorCode: 'OCR_TEXT_NOT_FOUND', errorMessage });
    return { assetId: asset.id, method: 'manual-required', quality: 'low', needsManualCleanup: true };
  }

  try {
    let buffer = await downloadFromStorage(asset.original_path);
    if (!buffer) {
      throw new AppError('IMAGE_CLEANUP_FAILED', undefined, '원본 이미지를 스토리지에서 찾을 수 없습니다.');
    }

    // 감지된 모든 영역을 차례로 덮는다. 각 영역의 테두리 색을 그때그때 다시 샘플링하므로
    // 앞서 덮은 결과가 뒤 영역 판단에 반영된다. 방식/품질은 대표로 마지막 값을 기록한다.
    let method: CleanupResult['method'] = 'solid-color-fill';
    let quality: CleanupResult['quality'] = 'good';
    for (const region of regions) {
      const stats = await sampleBorderPixels(buffer, region.bbox, asset.width, asset.height);
      method = decideCleanupMethod(stats);
      quality = assessCleanupQuality(method, stats);
      buffer =
        method === 'transparent-mask'
          ? await applyTransparentCleanup(buffer, region.bbox, asset.width, asset.height)
          : await applySolidColorCleanup(buffer, region.bbox, stats.medianColor, asset.width, asset.height);
    }

    const cleanedPath = `projects/${asset.project_id}/cleaned/${asset.id}.png`;
    await uploadToStorage(cleanedPath, buffer, 'image/png');

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

  // NVIDIA 호출 없이 Sharp 연산 + Storage I/O뿐이라 동시성 제한 없이 전부 병렬로 돌린다.
  const results = await Promise.all(assets.map((asset) => runCleanupForAsset(asset)));

  return results;
}
