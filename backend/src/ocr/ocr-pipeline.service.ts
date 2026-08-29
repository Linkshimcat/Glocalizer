import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { AppError, describeError } from '../errors/app-error.js';
import { prepareOcrFallbackVariants, preparePrimaryOcrImage } from '../image/vision-image-preprocessor.js';
import { findAssetsByProjectAndStatus, updateAsset } from '../repositories/asset.repository.js';
import { replaceOcrRegions } from '../repositories/ocr.repository.js';
import { downloadFromStorage } from '../repositories/storage.repository.js';
import type { AssetRow } from '../types/asset.js';
import { classifyConfidence, type OcrRegion } from '../types/ocr.js';
import { mapWithConcurrency } from '../utils/concurrency.js';
import { getOcrFallbackProvider, getOcrProvider, getShadowOcrProvider } from './ocr-provider.js';
import type { RecognizedRegion } from './ocr-provider.types.js';
import { measureShadowOcr } from './ocr-shadow.service.js';
import { selectOcrVariantCount } from './ocr-variant-selection.js';
import { deduplicateRecognizedRegions, mergeAdjacentKoreanRegions } from './merge-recognized-regions.js';
import { selectConsensusRegions } from './ocr-consensus.service.js';
import { shouldRunFallbackVariants, shouldUseVisionFallback } from './ocr-quality.js';
import { requestVisionOcr } from './vision-fallback.service.js';

function containsKorean(text: string): boolean {
  return /[\uAC00-\uD7A3]/.test(text);
}

function normalizeProviderRegions(providerName: string, regions: RecognizedRegion[]): RecognizedRegion[] {
  return providerName === 'luna'
    ? deduplicateRecognizedRegions(regions)
    : mergeAdjacentKoreanRegions(regions);
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
    const fallbackProvider = getOcrFallbackProvider();
    const shadowProvider = getShadowOcrProvider();
    if (shadowProvider && shadowProvider.name !== provider.name) {
      void measureShadowOcr(shadowProvider, asset.id, [primaryVariant.content]);
    }
    let activeProvider = provider;
    let primaryRegions: RecognizedRegion[];
    try {
      primaryRegions = normalizeProviderRegions(provider.name, await provider.recognize(primaryVariant.content));
      // Luna처럼 단발 정확도가 검증된 유료 Vision provider가 한글을 아예 못 찾았을 때만
      // 로컬 PaddleOCR로 한 번 더 확인한다. 재시도가 아니라 단발성 안전망이라 비용은 거의 늘지 않는다.
      if (fallbackProvider && !primaryRegions.some((region) => containsKorean(region.text))) {
        const fallbackRegions = normalizeProviderRegions(fallbackProvider.name, await fallbackProvider.recognize(primaryVariant.content));
        if (fallbackRegions.some((region) => containsKorean(region.text))) {
          activeProvider = fallbackProvider;
          primaryRegions = fallbackRegions;
        }
      }
    } catch (error) {
      if (!fallbackProvider) throw error;
      logger.warn({ err: error, assetId: asset.id, provider: provider.name }, 'OCR 주력 provider 처리 중 오류, PaddleOCR로 대체합니다.');
      activeProvider = fallbackProvider;
      primaryRegions = normalizeProviderRegions(fallbackProvider.name, await fallbackProvider.recognize(primaryVariant.content));
    }
    const results = [primaryRegions];
    // Luna/OpenVINO는 단일 호출 정확도가 이미 검증돼 있어, PaddleOCR 전용으로 설계된 이미지
    // 변형 앙상블(shouldRunFallbackVariants)과 짧은 문구 vision 재판정을 건너뛴다 — 둘 다
    // PaddleOCR의 저신뢰 특성을 보완하려고 만든 단계라 비용만 늘리고 효과가 없다.
    const isSingleShotVision = activeProvider.name === 'openvino-npu' || activeProvider.name === 'luna';
    if (!isSingleShotVision && shouldRunFallbackVariants(results[0])) {
      const fallbackVariants = await prepareOcrFallbackVariants(source, env.OCR_IMAGE_MAX_DIMENSION);
      // 한국어가 전혀 없을 때는 모든 fallback을 시도하지만, 불완전 문구는 빠른 두 변형만
      // 추가해 일반 이미지의 처리 시간을 불필요하게 늘리지 않는다.
      const fallbackCount = results[0].some((region) => containsKorean(region.text))
        ? Math.min(2, selectOcrVariantCount(activeProvider, fallbackVariants.length))
        : selectOcrVariantCount(activeProvider, fallbackVariants.length);
      for (const variant of fallbackVariants.slice(0, fallbackCount)) {
        variants.push(variant);
        const recognized = normalizeProviderRegions(activeProvider.name, await activeProvider.recognize(variant.content));
        results.push(recognized);
        if (!results[0].some((region) => containsKorean(region.text)) && recognized.some((region) => containsKorean(region.text))) break;
      }
    }
    const consensusRegions = selectConsensusRegions(results, { allowSingleVariantAutoApprove: isSingleShotVision });
    const consensus = consensusRegions[0] ?? null;
    let selected = consensus;
    let sourceName: OcrRegion['source'] = 'paddle-consensus';
    let agreementScore = consensus?.agreementScore ?? 0;
    let needsManualReview = consensus?.needsManualReview ?? true;
    if (!isSingleShotVision && shouldUseVisionFallback(selected, results[0], needsManualReview)) {
      const vision = await requestVisionOcr(variants[0].content, selected ?? undefined);
      if (vision !== null && vision.confidence >= 0.8 && containsKorean(vision.text)) {
        // Vision 모델은 글자 판독(짧은 한글 오독 보정)엔 강하지만, 프롬프트로 요청한 자체
        // polygon 좌표 추정은 신뢰할 수 없다는 걸 실측으로 확인했다 — "대박" 같은 2~3글자
        // 문구(shouldUseVisionFallback이 항상 vision을 타게 하는 케이스)에서 vision이 내놓은
        // polygon이 실제 글자와 겹치지 않는 빈 영역을 가리켜, cleanup 단계의 mask coverage가
        // 0%로 나와 자동 배경 정리가 항상 manual-required로 떨어지는 문제로 이어졌다.
        // PaddleOCR 후보가 이미 한글을 포함해 위치를 찾아둔 상태라면, 검출 전용 모델의 위치
        // 추정치를 그대로 쓰고 텍스트 내용만 vision으로 교체한다.
        const polygon = selected && containsKorean(selected.text) ? selected.polygon : vision.polygon;
        // Vision이 텍스트를 교정해도 기존 검출 polygon의 정확성까지 증명하지는 않는다.
        // 저합의 Paddle 좌표를 그대로 쓰는 경우 좌표 검수 플래그를 유지해 자동 cleanup을 막는다.
        const coordinateNeedsReview = selected?.needsManualReview ?? true;
        selected = { ...vision, polygon, agreementScore: vision.confidence, source: 'paddle-consensus', needsManualReview: coordinateNeedsReview };
        sourceName = 'vision-fallback'; agreementScore = vision.confidence; needsManualReview = coordinateNeedsReview;
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
