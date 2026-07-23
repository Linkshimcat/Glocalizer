import type { RecognizedRegion } from './ocr-provider.types.js';

const KOREAN_PATTERN = /[\uAC00-\uD7A3]/g;
const SHORT_PHRASE_LENGTH = 3;
const FRAGMENT_CONFIDENCE = 0.8;

function koreanLength(text: string): number {
  return text.match(KOREAN_PATTERN)?.length ?? 0;
}

function koreanRegions(regions: RecognizedRegion[]): RecognizedRegion[] {
  return regions.filter((region) => koreanLength(region.text) > 0);
}

/**
 * PaddleOCR가 한글을 찾았더라도, 짧게 잘렸거나 저신뢰 조각이 남으면
 * 이미지 변형 OCR을 추가로 실행한다. 손글씨 이모티콘의 누락을 놓치지 않기 위한 규칙이다.
 */
export function shouldRunFallbackVariants(regions: RecognizedRegion[]): boolean {
  const candidates = koreanRegions(regions);
  if (candidates.length === 0) return true;
  if (candidates.some((region) => koreanLength(region.text) <= SHORT_PHRASE_LENGTH)) return true;
  return candidates.length > 1 && candidates.some((region) => region.confidence < FRAGMENT_CONFIDENCE);
}

/** Vision은 비용과 지연을 줄이기 위해 불완전 가능성이 높은 결과에만 사용한다. */
export function shouldUseVisionFallback(
  selected: RecognizedRegion | null,
  primaryRegions: RecognizedRegion[],
  _consensusNeedsReview: boolean,
): boolean {
  if (!selected || koreanLength(selected.text) === 0) return true;
  if (koreanLength(selected.text) <= SHORT_PHRASE_LENGTH) return true;
  // 같은 오인식이 여러 변형에서 반복되면 합의 점수는 높아질 수 있다. 짧은 저신뢰 조각이
  // 함께 검출된 경우에는 합의 여부와 무관하게 Vision에 한 번만 재판정시킨다.
  return primaryRegions.length > 1 && primaryRegions.some((region) => region.confidence < FRAGMENT_CONFIDENCE);
}
