import { runTranslationsForAsset } from '../ai/localization/localization.service.js';
import { runCleanupForAsset } from '../image/cleanup.service.js';
import { AppError } from '../errors/app-error.js';
import { findAssetsByIds, updateAsset } from '../repositories/asset.repository.js';
import { updatePrimaryRegion } from '../repositories/ocr.repository.js';
import { findProjectById } from '../repositories/project.repository.js';
import { deleteTranslationsByOcrRegionId } from '../repositories/translation.repository.js';
import { removeFromStorage } from '../repositories/storage.repository.js';
import { downloadFromStorage } from '../repositories/storage.repository.js';
import type { PixelBox } from '../utils/bbox.js';
import { preparePrimaryOcrImage } from '../image/vision-image-preprocessor.js';
import { requestVisionOcr } from '../ocr/vision-fallback.service.js';
import type { RecognizedRegion } from '../ocr/ocr-provider.types.js';

function clampNormalizedBox(points: Array<{ x: number; y: number }>, width: number, height: number): PixelBox | null {
  if (points.length < 4) return null;
  const xs = points.map((point) => point.x / width);
  const ys = points.map((point) => point.y / height);
  const x = Math.max(0, Math.min(...xs));
  const y = Math.max(0, Math.min(...ys));
  const right = Math.min(1, Math.max(...xs));
  const bottom = Math.min(1, Math.max(...ys));
  return right > x && bottom > y ? { x, y, width: right - x, height: bottom - y } : null;
}

function overlapRatio(left: PixelBox, right: PixelBox): number {
  const width = Math.max(0, Math.min(left.x + left.width, right.x + right.width) - Math.max(left.x, right.x));
  const height = Math.max(0, Math.min(left.y + left.height, right.y + right.height) - Math.max(left.y, right.y));
  const intersection = width * height;
  return intersection / Math.max(0.0001, Math.min(left.width * left.height, right.width * right.height));
}

async function refineCorrectedBox(asset: { original_path: string | null }, text: string, currentBox: PixelBox): Promise<PixelBox> {
  if (!asset.original_path) return currentBox;
  const source = await downloadFromStorage(asset.original_path);
  if (!source) return currentBox;
  const image = await preparePrimaryOcrImage(source, 1280);
  const candidate: RecognizedRegion = {
    text,
    confidence: 1,
    polygon: [
      { x: currentBox.x * image.width, y: currentBox.y * image.height },
      { x: (currentBox.x + currentBox.width) * image.width, y: currentBox.y * image.height },
      { x: (currentBox.x + currentBox.width) * image.width, y: (currentBox.y + currentBox.height) * image.height },
      { x: currentBox.x * image.width, y: (currentBox.y + currentBox.height) * image.height },
    ],
  };
  const vision = await requestVisionOcr(image.content, candidate, { confirmedText: text });
  const refined = vision && vision.confidence >= 0.8 ? clampNormalizedBox(vision.polygon, image.width, image.height) : null;
  return refined && overlapRatio(currentBox, refined) >= 0.2 ? refined : currentBox;
}

export async function reviseOcrAndReprocess(projectId: string, assetId: string, text: string, normalizedBox: PixelBox): Promise<void> {
  const [project, asset] = await Promise.all([findProjectById(projectId), findAssetsByIds(projectId, [assetId])]);
  if (!project) throw new AppError('PROJECT_NOT_FOUND', { projectId });
  const target = asset[0];
  if (!target || !target.width || !target.height) throw new AppError('INVALID_REQUEST', { assetId }, '수정할 이미지를 찾을 수 없습니다.');
  const refinedNormalizedBox = await refineCorrectedBox(target, text, normalizedBox);
  const box = { x: Math.round(refinedNormalizedBox.x * target.width), y: Math.round(refinedNormalizedBox.y * target.height), width: Math.round(refinedNormalizedBox.width * target.width), height: Math.round(refinedNormalizedBox.height * target.height) };
  const region = await updatePrimaryRegion(assetId, { text, normalizedBox: refinedNormalizedBox, box });
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
