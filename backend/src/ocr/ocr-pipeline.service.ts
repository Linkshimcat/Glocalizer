import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { AppError, describeError } from '../errors/app-error.js';
import { prepareOcrFallbackVariants, preparePrimaryOcrImage } from '../image/vision-image-preprocessor.js';
import { findAssetsByProjectAndStatus, updateAsset } from '../repositories/asset.repository.js';
import { replaceOcrRegions } from '../repositories/ocr.repository.js';
import { downloadFromStorage } from '../repositories/storage.repository.js';
import type { AssetRow } from '../types/asset.js';
import { classifyConfidence, type OcrRegion } from '../types/ocr.js';
import { mapWithConcurrency } from '../utils/concurrency.js';
import { getOcrProvider, getShadowOcrProvider } from './ocr-provider.js';
import type { RecognizedRegion } from './ocr-provider.types.js';
import { measureShadowOcr } from './ocr-shadow.service.js';
import { selectOcrVariantCount } from './ocr-variant-selection.js';
import { mergeAdjacentKoreanRegions } from './merge-recognized-regions.js';
import { selectConsensusRegions } from './ocr-consensus.service.js';
import { shouldRunFallbackVariants, shouldUseVisionFallback } from './ocr-quality.js';
import { requestVisionOcr } from './vision-fallback.service.js';

function containsKorean(text: string): boolean {
  return /[\uAC00-\uD7A3]/.test(text);
}

function normalizePolygon(polygon: Array<{ x: number; y: number }>, width: number, height: number): OcrRegion['polygon'] {
  return polygon.map((point) => ({ x: Math.min(1, Math.max(0, point.x / width)), y: Math.min(1, Math.max(0, point.y / height)) }));
}

function regionFromRecognition(asset: AssetRow, region: RecognizedRegion, index: number, isPrimary: boolean, ocrWidth: number, ocrHeight: number, metadata: Pick<OcrRegion, 'source' | 'agreementScore' | 'needsManualReview'>): OcrRegion {
  const width = asset.width ?? 1;
  const height = asset.height ?? 1;
  const originalScaleX = width / ocrWidth;
  const originalScaleY = height / ocrHeight;
  const originalPolygon = region.polygon.map((point) => ({ x: point.x * originalScaleX, y: point.y * originalScaleY }));
  const polygon = normalizePolygon(originalPolygon, width, height);
  const xs = polygon.map((point) => point.x);
  const ys = polygon.map((point) => point.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  const normalizedWidth = Math.max(0, Math.min(1 - x, Math.max(...xs) - x));
  const normalizedHeight = Math.max(0, Math.min(1 - y, Math.max(...ys) - y));
  const confidence = Math.min(1, Math.max(0, region.confidence));
  return {
    id: randomUUID(),
    text: region.text.trim(),
    confidence,
    confidenceTier: classifyConfidence(confidence),
    box: { x: Math.round(x * width), y: Math.round(y * height), width: Math.round(normalizedWidth * width), height: Math.round(normalizedHeight * height) },
    normalizedBox: { x, y, width: normalizedWidth, height: normalizedHeight },
    polygon,
    containsKorean: containsKorean(region.text),
    readingOrder: index,
    isPrimary,
    ...metadata,
  };
}

async function recognizeAsset(asset: AssetRow): Promise<void> {
  try {
    if (!asset.original_path || !asset.width || !asset.height) throw new AppError('UPLOAD_NOT_COMPLETED');
    await updateAsset(asset.id, { status: 'preprocessing', stage: 'recognizing', progress: 20 });
    const source = await downloadFromStorage(asset.original_path);
    if (!source) throw new AppError('OCR_PROVIDER_FAILED', { assetId: asset.id }, '스토리지에서 원본 이미지를 찾지 못했습니다.');
    const primaryVariant = await preparePrimaryOcrImage(source, env.OCR_IMAGE_MAX_DIMENSION);
    const variants = [primaryVariant];
    const provider = getOcrProvider();
    const shadowProvider = getShadowOcrProvider();
    if (shadowProvider && shadowProvider.name !== provider.name) {
      void measureShadowOcr(shadowProvider, asset.id, [primaryVariant.content]);
    }
    const results = [mergeAdjacentKoreanRegions(await provider.recognize(primaryVariant.content))];
    if (shouldRunFallbackVariants(results[0])) {
      const fallbackVariants = await prepareOcrFallbackVariants(source, env.OCR_IMAGE_MAX_DIMENSION);
      // 한국어가 전혀 없을 때는 모든 fallback을 시도하지만, 불완전 문구는 빠른 두 변형만
      // 추가해 일반 이미지의 처리 시간을 불필요하게 늘리지 않는다.
      const fallbackCount = results[0].some((region) => containsKorean(region.text))
        ? Math.min(2, selectOcrVariantCount(provider, fallbackVariants.length))
        : selectOcrVariantCount(provider, fallbackVariants.length);
      for (const variant of fallbackVariants.slice(0, fallbackCount)) {
        variants.push(variant);
        const recognized = mergeAdjacentKoreanRegions(await provider.recognize(variant.content));
        results.push(recognized);
        if (!results[0].some((region) => containsKorean(region.text)) && recognized.some((region) => containsKorean(region.text))) break;
      }
    }
    const consensusRegions = selectConsensusRegions(results, { allowSingleVariantAutoApprove: provider.name === 'openvino-npu' });
    const consensus = consensusRegions[0] ?? null;
    let selected = consensus;
    let sourceName: OcrRegion['source'] = 'paddle-consensus';
    let agreementScore = consensus?.agreementScore ?? 0;
    let needsManualReview = consensus?.needsManualReview ?? true;
    if (shouldUseVisionFallback(selected, results[0], needsManualReview)) {
      const vision = await requestVisionOcr(variants[0].content, selected ?? undefined);
      if (vision !== null && vision.confidence >= 0.8 && containsKorean(vision.text)) {
        selected = { ...vision, agreementScore: vision.confidence, source: 'paddle-consensus', needsManualReview: false };
        sourceName = 'vision-fallback'; agreementScore = vision.confidence; needsManualReview = false;
      }
    }
    if (!selected) throw new AppError('OCR_TEXT_NOT_FOUND');
    if (!containsKorean(selected.text)) throw new AppError('OCR_KOREAN_NOT_FOUND');
    const storedCandidates = [
      {
        region: selected,
        source: sourceName,
        agreementScore,
        needsManualReview,
        isPrimary: true,
      },
      ...consensusRegions
        .filter((region) => region !== selected)
        .map((region) => ({
          region,
          source: 'paddle-consensus' as const,
          agreementScore: region.agreementScore,
          needsManualReview: region.needsManualReview,
          isPrimary: false,
        })),
    ].sort((left, right) => {
      const leftTop = Math.min(...left.region.polygon.map((point) => point.y));
      const rightTop = Math.min(...right.region.polygon.map((point) => point.y));
      if (leftTop !== rightTop) return leftTop - rightTop;
      return Math.min(...left.region.polygon.map((point) => point.x)) - Math.min(...right.region.polygon.map((point) => point.x));
    });
    const regions = storedCandidates.map((candidate, index) => regionFromRecognition(
      asset,
      candidate.region,
      index,
      candidate.isPrimary,
      variants[0].width,
      variants[0].height,
      { source: candidate.source, agreementScore: candidate.agreementScore, needsManualReview: candidate.needsManualReview },
    ));
    await replaceOcrRegions(asset.id, regions);
    await updateAsset(asset.id, { status: 'ocr', stage: needsManualReview ? 'ocr-review' : 'recognizing', progress: 55 });
  } catch (error) {
    const { code, message } = describeError(error, 'OCR_PROVIDER_FAILED', 'OCR 처리 중 알 수 없는 오류가 발생했습니다.');
    await updateAsset(asset.id, { status: 'failed', stage: 'recognizing', errorCode: code, errorMessage: message });
  }
}

export async function runOcrPipeline(projectId: string): Promise<void> {
  const assets = await findAssetsByProjectAndStatus(projectId, ['uploaded']);
  await mapWithConcurrency(assets, env.AI_CONCURRENCY, recognizeAsset);
}
