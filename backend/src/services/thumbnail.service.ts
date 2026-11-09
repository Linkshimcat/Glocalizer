import sharp from 'sharp';
import { env } from '../config/env.js';
import { AppError } from '../errors/app-error.js';
import { uploadThumbnailForOriginal } from '../repositories/storage.repository.js';
import { requireEditableAsset } from './ocr-review.service.js';

/**
 * 문구·번역은 저장된 스타일을 브라우저가 합성하므로 서버에는 완성본이 없다. 편집기가 합성해 보낸 PNG로
 * 업로드 때 만든 카드 썸네일을 덮어쓴다. 경로가 같아 프로젝트 삭제 시 기존처럼 함께 지워진다.
 */
export async function saveEditedThumbnail(projectId: string, assetId: string, image: unknown): Promise<void> {
  if (!Buffer.isBuffer(image) || image.length === 0) throw new AppError('INVALID_REQUEST', { assetId }, '썸네일 이미지가 필요합니다.');
  const asset = await requireEditableAsset(projectId, assetId);
  const metadata = await sharp(image).metadata().catch(() => null);
  if (!metadata) throw new AppError('INVALID_REQUEST', { assetId }, '썸네일 이미지를 읽을 수 없습니다.');
  if (metadata.format !== 'png' || !metadata.width || !metadata.height || metadata.width > env.MAX_IMAGE_WIDTH || metadata.height > env.MAX_IMAGE_HEIGHT) {
    throw new AppError('INVALID_REQUEST', { assetId }, '썸네일은 규격 안의 PNG만 저장할 수 있습니다.');
  }
  if (!await uploadThumbnailForOriginal(asset.original_path, image)) {
    throw new AppError('INTERNAL_ERROR', { assetId }, '썸네일을 저장하지 못했습니다.');
  }
}
