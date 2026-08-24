import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { AppError } from '../errors/app-error.js';
import { findAssetsByIds, updateAsset } from '../repositories/asset.repository.js';
import { findActiveJobForProject } from '../repositories/job.repository.js';
import { findRegionById, findRegionsByAssetId, insertOcrRegion, updatePrimaryRegion, updateRegionById } from '../repositories/ocr.repository.js';
import { findProjectById } from '../repositories/project.repository.js';
import { deleteTranslationsByOcrRegionId } from '../repositories/translation.repository.js';
import { removeFromStorage } from '../repositories/storage.repository.js';
import { downloadFromStorage } from '../repositories/storage.repository.js';
import type { PixelBox } from '../utils/bbox.js';
import { preparePrimaryOcrImage } from '../image/vision-image-preprocessor.js';
import { requestVisionOcr } from '../ocr/vision-fallback.service.js';
import type { RecognizedRegion } from '../ocr/ocr-provider.types.js';
import { getOcrFallbackProvider, getOcrProvider } from '../ocr/ocr-provider.js';
import { polygonToBox } from '../utils/bbox.js';
import { containsKorean } from '../utils/language.js';
import { classifyConfidence } from '../types/ocr.js';
import type { AssetRow } from '../types/asset.js';

export interface DetectedSelection {
  text: string;
  confidence: number;
  normalizedBox: PixelBox;
}

type EditableAsset = AssetRow & { width: number; height: number; original_path: string };

async function requireEditableAsset(projectId: string, assetId: string): Promise<EditableAsset> {
  const [project, assets] = await Promise.all([findProjectById(projectId), findAssetsByIds(projectId, [assetId])]);
  if (!project) throw new AppError('PROJECT_NOT_FOUND', { projectId });
  const asset = assets[0];
  if (!asset || !asset.width || !asset.height || !asset.original_path) {
    throw new AppError('INVALID_REQUEST', { assetId }, '수정할 원본 이미지를 찾을 수 없습니다.');
  }
  return asset as EditableAsset;
}

async function recognizeSelection(source: Buffer): Promise<RecognizedRegion[]> {
  const primary = getOcrProvider();
  try {
    const regions = await primary.recognize(source);
    if (regions.some((region) => containsKorean(region.text))) return regions;
  } catch {
    // 아래 fallback에서 한 번 더 시도한다.
  }
  const fallback = getOcrFallbackProvider();
  return fallback ? fallback.recognize(source) : [];
}

export async function detectOcrSelection(projectId: string, assetId: string, normalizedBox: PixelBox): Promise<DetectedSelection> {
  const asset = await requireEditableAsset(projectId, assetId);
  const source = await downloadFromStorage(asset.original_path);
  if (!source) throw new AppError('INVALID_REQUEST', { assetId }, '원본 이미지를 불러오지 못했습니다.');

  const left = Math.max(0, Math.floor(normalizedBox.x * asset.width));
  const top = Math.max(0, Math.floor(normalizedBox.y * asset.height));
  const width = Math.min(asset.width - left, Math.max(1, Math.ceil(normalizedBox.width * asset.width)));
  const height = Math.min(asset.height - top, Math.max(1, Math.ceil(normalizedBox.height * asset.height)));
  const scale = Math.min(3, Math.max(1, 900 / Math.max(width, height)));
  const crop = await sharp(source)
    .extract({ left, top, width, height })
    .resize({ width: Math.round(width * scale), height: Math.round(height * scale), fit: 'fill' })
    .png()
    .toBuffer();
  const metadata = await sharp(crop).metadata();
  const cropWidth = metadata.width ?? Math.round(width * scale);
  const cropHeight = metadata.height ?? Math.round(height * scale);
  const recognized = (await recognizeSelection(crop))
    .filter((region) => containsKorean(region.text))
    .sort((leftRegion, rightRegion) => {
      const leftBox = polygonToBox(leftRegion.polygon);
      const rightBox = polygonToBox(rightRegion.polygon);
      return leftBox.y - rightBox.y || leftBox.x - rightBox.x;
    });
  if (recognized.length === 0) {
    throw new AppError('OCR_KOREAN_NOT_FOUND', { assetId }, '선택한 영역에서 한국어 문구를 찾지 못했습니다.');
  }

  const boxes = recognized.map((region) => polygonToBox(region.polygon));
  const cropLeft = Math.min(...boxes.map((box) => box.x));
  const cropTop = Math.min(...boxes.map((box) => box.y));
  const cropRight = Math.max(...boxes.map((box) => box.x + box.width));
  const cropBottom = Math.max(...boxes.map((box) => box.y + box.height));
  return {
    text: recognized.map((region) => region.text.trim()).filter(Boolean).join('\n'),
    confidence: recognized.reduce((sum, region) => sum + region.confidence, 0) / recognized.length,
    normalizedBox: {
      x: normalizedBox.x + (cropLeft / cropWidth) * normalizedBox.width,
      y: normalizedBox.y + (cropTop / cropHeight) * normalizedBox.height,
      width: ((cropRight - cropLeft) / cropWidth) * normalizedBox.width,
      height: ((cropBottom - cropTop) / cropHeight) * normalizedBox.height,
    },
  };
}

async function resetAssetForOcrReprocessing(asset: { id: string; cleaned_path: string | null }): Promise<void> {
  if (asset.cleaned_path) await removeFromStorage([asset.cleaned_path]);
  await updateAsset(asset.id, { status: 'ocr', stage: 'ocr-corrected', progress: 55, cleanedPath: null, cleanupMethod: null, cleanupQuality: null, needsManualCleanup: false });
}

export async function createOcrRegionAndReprocess(projectId: string, assetId: string, text: string, normalizedBox: PixelBox): Promise<string> {
  const activeJob = await findActiveJobForProject(projectId);
  if (activeJob) throw new AppError('PROCESS_ALREADY_RUNNING', { projectId, jobId: activeJob.id }, '처리 중인 작업이 끝난 뒤 OCR 문구를 추가해주세요.');
  if (!containsKorean(text)) throw new AppError('INVALID_REQUEST', { text }, '한국어가 포함된 원문을 입력해주세요.');
  const asset = await requireEditableAsset(projectId, assetId);
  const regions = await findRegionsByAssetId(assetId);
  const box = {
    x: Math.round(normalizedBox.x * asset.width),
    y: Math.round(normalizedBox.y * asset.height),
    width: Math.round(normalizedBox.width * asset.width),
    height: Math.round(normalizedBox.height * asset.height),
  };
  const region = await insertOcrRegion(assetId, {
    id: randomUUID(),
    text,
    confidence: 1,
    confidenceTier: classifyConfidence(1),
    box,
    normalizedBox,
    polygon: [
      { x: box.x, y: box.y },
      { x: box.x + box.width, y: box.y },
      { x: box.x + box.width, y: box.y + box.height },
      { x: box.x, y: box.y + box.height },
    ],
    containsKorean: true,
    readingOrder: Math.max(-1, ...regions.map((candidate) => candidate.reading_order)) + 1,
    isPrimary: regions.length === 0,
    source: 'vision-fallback',
    agreementScore: 1,
    needsManualReview: false,
  });
  await resetAssetForOcrReprocessing(asset);
  return region.id;
}

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

export async function reviseOcrAndReprocess(projectId: string, assetId: string, text: string, normalizedBox: PixelBox, regionId?: string): Promise<void> {
  const activeJob = await findActiveJobForProject(projectId);
  if (activeJob) {
    throw new AppError('PROCESS_ALREADY_RUNNING', { projectId, jobId: activeJob.id }, '처리 중인 작업이 끝난 뒤 OCR 문구를 수정해주세요.');
  }

  const [project, asset] = await Promise.all([findProjectById(projectId), findAssetsByIds(projectId, [assetId])]);
  if (!project) throw new AppError('PROJECT_NOT_FOUND', { projectId });
  const target = asset[0];
  if (!target || !target.width || !target.height) throw new AppError('INVALID_REQUEST', { assetId }, '수정할 이미지를 찾을 수 없습니다.');
  const refinedNormalizedBox = await refineCorrectedBox(target, text, normalizedBox);
  const box = { x: Math.round(refinedNormalizedBox.x * target.width), y: Math.round(refinedNormalizedBox.y * target.height), width: Math.round(refinedNormalizedBox.width * target.width), height: Math.round(refinedNormalizedBox.height * target.height) };
  if (regionId) {
    const existing = await findRegionById(regionId);
    if (!existing || existing.asset_id !== assetId) throw new AppError('INVALID_REQUEST', { regionId }, '해당 이미지에 속하지 않는 OCR 영역입니다.');
  }
  const region = regionId
    ? await updateRegionById(regionId, { text, normalizedBox: refinedNormalizedBox, box })
    : await updatePrimaryRegion(assetId, { text, normalizedBox: refinedNormalizedBox, box });
  if (!region) throw new AppError('INVALID_REQUEST', { assetId, regionId }, '수정할 OCR 영역을 찾을 수 없습니다.');
  await deleteTranslationsByOcrRegionId(region.id);
  await resetAssetForOcrReprocessing(target);
}
