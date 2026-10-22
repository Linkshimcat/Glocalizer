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
import { recognizeWithCache } from './ocr-recognition-cache.js';
import { measureShadowOcr } from './ocr-shadow.service.js';
import { selectOcrVariantCount } from './ocr-variant-selection.js';
import { deduplicateRecognizedRegions, mergeAdjacentKoreanRegions } from './merge-recognized-regions.js';
import { editSimilarity, selectConsensusRegions, type ConsensusRegion } from './ocr-consensus.service.js';
import { shouldCrossCheckWithPaddle, shouldRunFallbackVariants, shouldUseVisionFallback } from './ocr-quality.js';
import { requestVisionOcr } from './vision-fallback.service.js';
import type { OcrProvider } from './ocr-provider.types.js';

// Luna는 같은 이미지도 호출마다 다르게 읽을 수 있고(비결정성), 자체 confidence는 오독일 때도
// 높게 나와 신뢰 신호로 쓸 수 없다는 걸 실측으로 확인했다(2026-09-17, "덩실 덩"→"멍실멍" 오독
// 사례, 정답/오답 모두 confidence 0.86~0.87). PaddleOCR는 비용이 들지 않는 로컬 모델이라,
// Luna 결과와 위치가 겹치는 영역의 텍스트가 크게 다르면 "둘 다 맞을 수도 틀릴 수도 있다"는
// 뜻으로 보고 자동 승인 대신 사용자 검수로 넘긴다. 텍스트 자체를 덮어쓰지는 않는다 — 어느
// 쪽이 더 정확한지 알고리즘으로 판단할 근거가 없기 때문이다.
const CROSS_CHECK_MIN_OVERLAP = 0.3;
const CROSS_CHECK_MIN_SIMILARITY = 0.6;

function boundsOf(region: RecognizedRegion) {
  const xs = region.polygon.map((point) => point.x);
  const ys = region.polygon.map((point) => point.y);
  return { left: Math.min(...xs), top: Math.min(...ys), right: Math.max(...xs), bottom: Math.max(...ys) };
}

/**
 * 표준 IoU는 두 박스 크기가 비슷할 때만 잘 맞는다. Luna가 한 캡션을 여러 조각(작은 박스)으로
 * 쪼갰는데 PaddleOCR는 하나로 합쳐서 반환하면(실측 사례), 작은 조각 하나 대 큰 박스의 IoU가
 * 낮게 나와 실제로는 같은 글자를 가리키는데도 대조가 안 됐다. "더 작은 박스 기준으로 얼마나
 * 덮였는지"를 보면, 작은 조각이 큰 박스 안에 완전히 들어있는 정상 케이스를 놓치지 않는다.
 */
function overlapRatio(left: RecognizedRegion, right: RecognizedRegion): number {
  const a = boundsOf(left);
  const b = boundsOf(right);
  const overlapWidth = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
  const overlapHeight = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  const overlapArea = overlapWidth * overlapHeight;
  const areaA = Math.max(1, (a.right - a.left) * (a.bottom - a.top));
  const areaB = Math.max(1, (b.right - b.left) * (b.bottom - b.top));
  return overlapArea / Math.min(areaA, areaB);
}

/**
 * PaddleOCR는 문장 끝 말줄임표·느낌표 같은 작은 구두점을 자주 놓친다(실측 확인: "놀자.."을
 * "놀자"로 읽음). 이런 트레일링 구두점 차이만으로 실제로는 일치하는 Luna 결과를 "불일치"로
 * 오판해 배경이 단순한데도 검수로 빠지는 사례가 있었다 — 구두점 유무는 진짜 오독과 다르게
 * 취급해야 한다.
 */
function stripTrailingPunctuation(text: string): string {
  return text.replace(/[.!?~…,]+$/u, '').trim();
}

export async function crossCheckWithPaddleOcr(regions: ConsensusRegion[], image: Buffer, paddleProvider: OcrProvider): Promise<ConsensusRegion[]> {
  if (regions.length === 0) return regions;
  let paddleRegions: RecognizedRegion[];
  try {
    paddleRegions = mergeAdjacentKoreanRegions(await recognizeWithCache(paddleProvider, image));
  } catch (error) {
    // 대조는 부가 안전장치일 뿐이다. PaddleOCR 브릿지 실패가 이미 확보한 Luna 결과까지
    // 검수로 밀어내면 안 된다.
    logger.warn({ err: error }, 'PaddleOCR 대조 호출 실패, 기존 OCR 결과를 그대로 사용합니다.');
    return regions;
  }
  return regions.map((region) => {
    const bestMatch = paddleRegions
      .map((candidate) => ({ candidate, overlap: overlapRatio(region, candidate) }))
      .sort((left, right) => right.overlap - left.overlap)[0];
    if (!bestMatch || bestMatch.overlap < CROSS_CHECK_MIN_OVERLAP) return region;
    const agrees = editSimilarity(stripTrailingPunctuation(region.text), stripTrailingPunctuation(bestMatch.candidate.text)) >= CROSS_CHECK_MIN_SIMILARITY;
    return agrees ? region : { ...region, needsManualReview: true };
  });
}

const TIEBREAKER_MIN_CONFIDENCE = 0.8;

/**
 * Luna-Paddle \uB300\uC870\uC5D0\uC11C \uBD88\uC77C\uCE58\uAC00 \uB098\uBA74 \uC9C0\uAE08\uAE4C\uC9C0\uB294 \uBC14\uB85C \uC0AC\uC6A9\uC790 \uAC80\uC218\uB85C \uB118\uACBC\uB2E4(\uC704 \uC8FC\uC11D \uCC38\uACE0
 * \u2014 "\uC5B4\uB290 \uCABD\uC774 \uB354 \uC815\uD655\uD55C\uC9C0 \uC54C\uACE0\uB9AC\uC998\uC73C\uB85C \uD310\uB2E8\uD560 \uADFC\uAC70\uAC00 \uC5C6\uB2E4"). \uADF8\uB7F0\uB370 README \uBCA4\uCE58\uB9C8\uD06C\uC5D0\uC11C
 * \uC774\uBBF8 \uC138 \uBC88\uC9F8 \uC5D4\uC9C4(Gemini/Groq vision, requestVisionOcr)\uC774 IoU \uAE30\uC900 \uAC00\uC7A5 \uC815\uD655\uD55C \uAC78\uB85C
 * \uD655\uC778\uB3FC \uC788\uB294\uB370\uB3C4, Luna\uAC00 \uC8FC\uB825\uC77C \uB54C\uB294 \uC774 vision \uACBD\uB85C\uAC00 \uC804\uD600 \uD638\uCD9C\uB418\uC9C0 \uC54A\uC558\uB2E4(isSingleShotVision
 * \uAC00\uB4DC\uAC00 PaddleOCR \uC804\uC6A9 \uBCF4\uC644 \uB85C\uC9C1\uC73C\uB85C\uB9CC \uD55C\uC815\uD574\uC11C \uAC74\uB108\uB6F0\uAC8C \uB3FC \uC788\uC5C8\uC74C). \uBD88\uC77C\uCE58\uAC00 \uB09C \uC601\uC5ED\uC5D0\uB9CC
 * \uD55C\uD574 vision\uC744 \uC138 \uBC88\uC9F8 \uC2EC\uD310\uC73C\uB85C \uD55C \uBC88 \uB354 \uBD88\uB7EC\uC11C, \uB458 \uC911 \uD558\uB098\uC640 \uC758\uACAC\uC774 \uAC19\uC73C\uBA74 \uC790\uB3D9\uC73C\uB85C
 * \uD480\uC5B4\uC8FC\uACE0, \uC14B\uC774 \uB2E4 \uB2E4\uB974\uBA74 \uAE30\uC874\uB300\uB85C \uAC80\uC218\uC5D0 \uB0A8\uAE34\uB2E4. \uD3B8\uD5A5\uC744 \uD53C\uD558\uB824\uACE0 vision\uC5D0\uB294 Luna/Paddle
 * \uC911 \uB204\uAD6C\uC758 \uAE00\uC790\uC778\uC9C0 \uD78C\uD2B8\uB97C \uC8FC\uC9C0 \uC54A\uACE0 \uB3C5\uB9BD\uC801\uC73C\uB85C \uB2E4\uC2DC \uC77D\uAC8C \uD55C\uB2E4. polygon\uC740 \uC4F0\uC9C0 \uC54A\uB294\uB2E4 \u2014
 * vision\uC758 \uC704\uCE58 \uCD94\uC815\uC774 \uC9E7\uC740 \uBB38\uAD6C\uC5D0\uC11C \uC2E0\uB8B0 \uBD88\uAC00\uB77C\uB294 \uAC8C \uC774\uBBF8 \uC544\uB798(shouldUseVisionFallback
 * \uBD84\uAE30)\uC5D0\uC11C \uC2E4\uCE21\uC73C\uB85C \uD655\uC778\uB3FC \uC788\uB2E4.
 */
export async function resolveDisagreementWithVisionTiebreaker(
  regions: ConsensusRegion[],
  image: Buffer,
  paddleProvider: OcrProvider,
): Promise<ConsensusRegion[]> {
  const disagreeing = regions.filter((region) => region.needsManualReview);
  if (disagreeing.length === 0) return regions;

  let paddleRegions: RecognizedRegion[];
  try {
    paddleRegions = mergeAdjacentKoreanRegions(await recognizeWithCache(paddleProvider, image));
  } catch {
    return regions;
  }

  return Promise.all(regions.map(async (region) => {
    if (!region.needsManualReview) return region;
    const vision = await requestVisionOcr(image);
    if (!vision || vision.confidence < TIEBREAKER_MIN_CONFIDENCE || !containsKorean(vision.text)) return region;

    const visionText = stripTrailingPunctuation(vision.text);
    if (editSimilarity(stripTrailingPunctuation(region.text), visionText) >= CROSS_CHECK_MIN_SIMILARITY) {
      return { ...region, needsManualReview: false };
    }
    const paddleMatch = paddleRegions
      .map((candidate) => ({ candidate, overlap: overlapRatio(region, candidate) }))
      .sort((left, right) => right.overlap - left.overlap)[0];
    if (paddleMatch && paddleMatch.overlap >= CROSS_CHECK_MIN_OVERLAP
      && editSimilarity(stripTrailingPunctuation(paddleMatch.candidate.text), visionText) >= CROSS_CHECK_MIN_SIMILARITY) {
      return { ...region, text: paddleMatch.candidate.text, needsManualReview: false };
    }
    return region;
  }));
}

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
      primaryRegions = normalizeProviderRegions(provider.name, await recognizeWithCache(provider, primaryVariant.content));
      // Luna처럼 단발 정확도가 검증된 유료 Vision provider가 한글을 아예 못 찾았을 때만
      // 로컬 PaddleOCR로 한 번 더 확인한다. 재시도가 아니라 단발성 안전망이라 비용은 거의 늘지 않는다.
      if (fallbackProvider && !primaryRegions.some((region) => containsKorean(region.text))) {
        const fallbackRegions = normalizeProviderRegions(fallbackProvider.name, await recognizeWithCache(fallbackProvider, primaryVariant.content));
        if (fallbackRegions.some((region) => containsKorean(region.text))) {
          activeProvider = fallbackProvider;
          primaryRegions = fallbackRegions;
        }
      }
    } catch (error) {
      if (!fallbackProvider) throw error;
      logger.warn({ err: error, assetId: asset.id, provider: provider.name }, 'OCR 주력 provider 처리 중 오류, PaddleOCR로 대체합니다.');
      activeProvider = fallbackProvider;
      primaryRegions = normalizeProviderRegions(fallbackProvider.name, await recognizeWithCache(fallbackProvider, primaryVariant.content));
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
        const recognized = normalizeProviderRegions(activeProvider.name, await recognizeWithCache(activeProvider, variant.content));
        results.push(recognized);
        if (!results[0].some((region) => containsKorean(region.text)) && recognized.some((region) => containsKorean(region.text))) break;
      }
    }
    let consensusRegions = selectConsensusRegions(results, { allowSingleVariantAutoApprove: isSingleShotVision });
    if (activeProvider.name === 'luna' && fallbackProvider && shouldCrossCheckWithPaddle(consensusRegions)) {
      consensusRegions = await crossCheckWithPaddleOcr(consensusRegions, primaryVariant.content, fallbackProvider);
      consensusRegions = await resolveDisagreementWithVisionTiebreaker(consensusRegions, primaryVariant.content, fallbackProvider);
    }
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
