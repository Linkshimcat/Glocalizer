import { AppError } from '../errors/app-error.js';
import { upsertEditorState } from '../repositories/editor-state.repository.js';
import { findAssetsByIds } from '../repositories/asset.repository.js';
import { findRegionById } from '../repositories/ocr.repository.js';

export async function saveEditorState(
  projectId: string,
  assetId: string,
  regionId: string,
  languageCode: string,
  style: Record<string, unknown>,
): Promise<void> {
  const [asset] = await findAssetsByIds(projectId, [assetId]);
  if (!asset) {
    throw new AppError('INVALID_REQUEST', { assetId }, '해당 프로젝트에 속하지 않는 이미지입니다.');
  }

  const region = await findRegionById(regionId);
  if (!region || region.asset_id !== assetId) {
    throw new AppError('INVALID_REQUEST', { regionId }, '해당 이미지에 속하지 않는 OCR 영역입니다.');
  }

  await upsertEditorState({ assetId, ocrRegionId: regionId, languageCode, style });
}
