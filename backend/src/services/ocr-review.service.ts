import { runTranslationsForAsset } from '../ai/localization/localization.service.js';
import { runCleanupForAsset } from '../image/cleanup.service.js';
import { AppError } from '../errors/app-error.js';
import { findAssetsByIds, updateAsset } from '../repositories/asset.repository.js';
import { updatePrimaryRegion } from '../repositories/ocr.repository.js';
import { findProjectById } from '../repositories/project.repository.js';
import { deleteTranslationsByOcrRegionId } from '../repositories/translation.repository.js';
import { removeFromStorage } from '../repositories/storage.repository.js';
import type { PixelBox } from '../utils/bbox.js';

export async function reviseOcrAndReprocess(projectId: string, assetId: string, text: string, normalizedBox: PixelBox): Promise<void> {
  const [project, asset] = await Promise.all([findProjectById(projectId), findAssetsByIds(projectId, [assetId])]);
  if (!project) throw new AppError('PROJECT_NOT_FOUND', { projectId });
  const target = asset[0];
  if (!target || !target.width || !target.height) throw new AppError('INVALID_REQUEST', { assetId }, '수정할 이미지를 찾을 수 없습니다.');
  const box = { x: Math.round(normalizedBox.x * target.width), y: Math.round(normalizedBox.y * target.height), width: Math.round(normalizedBox.width * target.width), height: Math.round(normalizedBox.height * target.height) };
  const region = await updatePrimaryRegion(assetId, { text, normalizedBox, box });
  if (!region) throw new AppError('INVALID_REQUEST', { assetId }, '대표 OCR 영역을 찾을 수 없습니다.');
  await deleteTranslationsByOcrRegionId(region.id);
  if (target.cleaned_path) await removeFromStorage([target.cleaned_path]);
  await updateAsset(assetId, { status: 'ocr', stage: 'ocr-corrected', progress: 55, cleanedPath: null, cleanupMethod: null, cleanupQuality: null, needsManualCleanup: false });
  const refreshed = (await findAssetsByIds(projectId, [assetId]))[0];
  if (!refreshed) throw new AppError('INVALID_REQUEST', { assetId }, '이미지 상태를 새로고침하지 못했습니다.');
  const translation = await runTranslationsForAsset(refreshed, project.target_languages, project.localization_options);
  if (translation.status === 'failed') return;
  const cleanupAsset = (await findAssetsByIds(projectId, [assetId]))[0];
  if (cleanupAsset) await runCleanupForAsset(cleanupAsset);
}
