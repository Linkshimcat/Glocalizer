import sharp, { type Metadata } from 'sharp';
import { env } from '../config/env.js';
import { findAssetsByIds, updateAsset } from '../repositories/asset.repository.js';
import { downloadFromStorage } from '../repositories/storage.repository.js';
import type { AssetRow } from '../types/asset.js';

const FORMAT_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpeg',
};

export interface AssetUploadResult {
  assetId: string;
  status: 'uploaded' | 'failed';
  errorCode?: string;
  errorMessage?: string;
}

async function fail(assetId: string, errorCode: string, errorMessage: string): Promise<AssetUploadResult> {
  await updateAsset(assetId, { status: 'failed', errorCode, errorMessage });
  return { assetId, status: 'failed', errorCode, errorMessage };
}

async function validateAndStoreAsset(asset: AssetRow): Promise<AssetUploadResult> {
  if (!asset.original_path) {
    return fail(asset.id, 'UPLOAD_NOT_COMPLETED', '업로드 경로가 없습니다.');
  }

  const buffer = await downloadFromStorage(asset.original_path);
  if (!buffer) {
    return fail(asset.id, 'UPLOAD_NOT_COMPLETED', '스토리지에서 파일을 찾을 수 없습니다. 업로드가 완료되었는지 확인해주세요.');
  }

  let metadata: Metadata;
  try {
    metadata = await sharp(buffer).metadata();
  } catch {
    return fail(asset.id, 'IMAGE_DECODE_FAILED', '이미지를 디코딩할 수 없습니다.');
  }

  const expectedFormat = FORMAT_BY_MIME[asset.mime_type];
  if (!metadata.format || metadata.format !== expectedFormat) {
    return fail(asset.id, 'INVALID_FILE_TYPE', `선언된 형식(${asset.mime_type})과 실제 파일 형식이 일치하지 않습니다.`);
  }

  if (!metadata.width || !metadata.height) {
    return fail(asset.id, 'IMAGE_DECODE_FAILED', '이미지 크기를 확인할 수 없습니다.');
  }

  if (metadata.width > env.MAX_IMAGE_WIDTH || metadata.height > env.MAX_IMAGE_HEIGHT) {
    return fail(asset.id, 'FILE_TOO_LARGE', `이미지 해상도는 ${env.MAX_IMAGE_WIDTH}x${env.MAX_IMAGE_HEIGHT}를 초과할 수 없습니다.`);
  }

  await updateAsset(asset.id, {
    status: 'uploaded',
    width: metadata.width,
    height: metadata.height,
    hasAlpha: Boolean(metadata.hasAlpha),
  });

  return { assetId: asset.id, status: 'uploaded' };
}

export async function completeUploads(projectId: string, assetIds: string[]): Promise<AssetUploadResult[]> {
  const assets = await findAssetsByIds(projectId, assetIds);
  const foundIds = new Set(assets.map((asset) => asset.id));

  const missing: AssetUploadResult[] = assetIds
    .filter((id) => !foundIds.has(id))
    .map((id) => ({
      assetId: id,
      status: 'failed',
      errorCode: 'INVALID_REQUEST',
      errorMessage: '해당 프로젝트에 속하지 않는 이미지입니다.',
    }));

  const results = await Promise.all(assets.map((asset) => validateAndStoreAsset(asset)));

  return [...results, ...missing];
}
