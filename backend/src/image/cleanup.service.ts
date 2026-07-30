import { findAssetsByProjectAndStatus, updateAsset } from '../repositories/asset.repository.js';
import { findPrimaryRegion } from '../repositories/ocr.repository.js';
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
import { applyBlurCleanup } from './blur-cleanup.js';
import type { PixelBox } from '../utils/bbox.js';
import { generateTextEraseMask } from './mask-generator.js';
import { isMaskCoverageSafe, measureMaskCoverage } from './mask-coverage.js';
import { mapWithConcurrency } from '../utils/concurrency.js';

// 자동 삭제가 어려운(단색 추정 불확실·마스크 위험) 복잡 배경은, 포기(manual-required) 대신
// 해당 영역을 강하게 블러 처리해 원문을 못 읽게 만든다. 번역 텍스트가 위에 얹혀 가독성을 확보한다.
async function runBlurFallback(
  asset: AssetRow,
  box: PixelBox,
  width: number,
  height: number,
  buffer: Buffer,
  textColor: { r: number; g: number; b: number } | null,
): Promise<CleanupResult & { assetId: string }> {
  const cleanedBuffer = await applyBlurCleanup(buffer, box, width, height);
  const cleanedPath = `projects/${asset.project_id}/cleaned/${asset.id}.png`;
  await uploadToStorage(cleanedPath, cleanedBuffer, 'image/png');
  await updateAsset(asset.id, {
    status: 'completed',
    stage: 'cleaning',
    progress: 100,
    cleanedPath,
    cleanupMethod: 'blur-mask',
    cleanupQuality: 'acceptable',
    needsManualCleanup: false,
    textColor,
  });
  return { assetId: asset.id, method: 'blur-mask', quality: 'acceptable', needsManualCleanup: false, cleanedImagePath: cleanedPath };
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

    // 단색 추정이 불확실한 복잡 배경은, 캐릭터·말풍선까지 지우는 위험한 자동 삭제 대신
    // 블러 fallback으로 원문을 못 읽게 뭉갠다(그 위에 번역 텍스트가 얹힌다).
    if (method === 'manual-required' || quality === 'low') {
      return runBlurFallback(asset, region.bbox, asset.width, asset.height, buffer, textColor);
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
    // 마스크가 위험(너무 많이/적게 지움)하면 정밀 삭제 대신 블러 fallback으로 안전하게 뭉갠다.
    if (!isMaskCoverageSafe(measureMaskCoverage(mask))) {
      return runBlurFallback(asset, region.bbox, asset.width, asset.height, buffer, textColor);
    }

    const cleanedBuffer =
      method === 'transparent-mask'
        ? await applyTransparentCleanup(buffer, region.bbox, asset.width, asset.height, mask)
        : method === 'directional-inpaint'
          ? await applyDirectionalInpaint(buffer, region.bbox, asset.width, asset.height, mask)
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
