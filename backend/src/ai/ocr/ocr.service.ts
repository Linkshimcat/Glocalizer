import { updateAsset, findAssetsByProjectAndStatus } from '../../repositories/asset.repository.js';
import { replaceOcrRegions } from '../../repositories/ocr.repository.js';
import { updateProjectStage } from '../../repositories/project.repository.js';
import { downloadFromStorage } from '../../repositories/storage.repository.js';
import { prepareImageForOcr } from '../../image/ocr-image-preprocessor.js';
import type { AssetRow } from '../../types/asset.js';
import { AppError } from '../../errors/app-error.js';
import { mergeCloseRegions } from './region-merger.js';
import { normalizeOcrRegions } from './ocr-normalizer.js';
import { nemotronOcrProvider } from './nemotron-ocr.provider.js';
import { selectPrimaryRegion } from './primary-region-selector.js';

export interface AssetOcrResult {
  assetId: string;
  status: 'ocr' | 'failed';
  regionCount: number;
  errorCode?: string;
  errorMessage?: string;
}

async function toOcrDataUrl(assetPath: string): Promise<string> {
  const buffer = await downloadFromStorage(assetPath);
  if (!buffer) {
    throw new AppError('OCR_TEXT_NOT_FOUND', undefined, '이미지 파일을 스토리지에서 찾을 수 없습니다.');
  }
  // bbox는 0~1 정규화 좌표로 반환되므로, 원본 대신 OCR용으로 축소된 이미지를 보내도
  // 좌표를 원본 크기(asset.width/height)로 되돌리는 계산에는 영향이 없다.
  const { dataUrl } = await prepareImageForOcr(buffer);
  return dataUrl;
}

export async function runOcrForAsset(asset: AssetRow): Promise<AssetOcrResult> {
  if (!asset.original_path || !asset.width || !asset.height) {
    const errorMessage = '업로드 검증이 완료되지 않은 이미지입니다.';
    await updateAsset(asset.id, { status: 'failed', stage: 'ocr', errorCode: 'UPLOAD_NOT_COMPLETED', errorMessage });
    return { assetId: asset.id, status: 'failed', regionCount: 0, errorCode: 'UPLOAD_NOT_COMPLETED', errorMessage };
  }

  try {
    const dataUrl = await toOcrDataUrl(asset.original_path);
    const [result] = await nemotronOcrProvider.recognize([{ assetId: asset.id, dataUrl }]);

    const normalized = normalizeOcrRegions(result?.detections ?? [], {
      imageWidth: asset.width,
      imageHeight: asset.height,
    });
    const merged = mergeCloseRegions(normalized);

    if (merged.length === 0) {
      const errorMessage = '이미지에서 텍스트를 찾지 못했습니다.';
      await updateAsset(asset.id, { status: 'failed', stage: 'ocr', errorCode: 'OCR_TEXT_NOT_FOUND', errorMessage });
      await replaceOcrRegions(asset.id, []);
      return { assetId: asset.id, status: 'failed', regionCount: 0, errorCode: 'OCR_TEXT_NOT_FOUND', errorMessage };
    }

    const withPrimary = selectPrimaryRegion(merged, asset.width, asset.height);
    await replaceOcrRegions(asset.id, withPrimary);
    await updateAsset(asset.id, { status: 'ocr', stage: 'ocr', progress: 100 });

    return { assetId: asset.id, status: 'ocr', regionCount: withPrimary.length };
  } catch (err) {
    const errorCode = err instanceof AppError ? err.code : 'NEMOTRON_OCR_FAILED';
    const errorMessage = err instanceof AppError ? err.message : 'OCR 처리 중 알 수 없는 오류가 발생했습니다.';
    await updateAsset(asset.id, { status: 'failed', stage: 'ocr', errorCode, errorMessage });
    return { assetId: asset.id, status: 'failed', regionCount: 0, errorCode, errorMessage };
  }
}

export async function runProjectOcr(projectId: string): Promise<AssetOcrResult[]> {
  const assets = await findAssetsByProjectAndStatus(projectId, ['uploaded']);

  await updateProjectStage(projectId, { status: 'processing', stage: 'ocr', progress: 0 });

  const results: AssetOcrResult[] = [];
  for (const asset of assets) {
    results.push(await runOcrForAsset(asset));
  }

  const allFailed = results.length > 0 && results.every((result) => result.status === 'failed');
  await updateProjectStage(projectId, {
    stage: 'ocr',
    progress: 100,
    ...(allFailed ? { status: 'failed', errorCode: 'OCR_TEXT_NOT_FOUND' } : {}),
  });

  return results;
}
