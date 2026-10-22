import { beforeEach, describe, expect, it, vi } from 'vitest';

const requestVisionOcrMock = vi.fn();
vi.mock('../../src/ocr/vision-fallback.service.js', () => ({ requestVisionOcr: requestVisionOcrMock }));

const { resolveDisagreementWithVisionTiebreaker } = await import('../../src/ocr/ocr-pipeline.service.js');
const { clearOcrRecognitionCacheForTests } = await import('../../src/ocr/ocr-recognition-cache.js');
import type { ConsensusRegion } from '../../src/ocr/ocr-consensus.service.js';
import type { OcrProvider, RecognizedRegion } from '../../src/ocr/ocr-provider.types.js';

function box(left: number, top: number, right: number, bottom: number) {
  return [{ x: left, y: top }, { x: right, y: top }, { x: right, y: bottom }, { x: left, y: bottom }];
}

function consensusRegion(text: string, needsManualReview: boolean): ConsensusRegion {
  return { text, confidence: 0.87, polygon: box(54, 17, 133, 44), agreementScore: 1, source: 'paddle-consensus', needsManualReview };
}

function paddleProviderReturning(regions: RecognizedRegion[]): OcrProvider {
  return { name: 'paddle', recognize: vi.fn().mockResolvedValue(regions) };
}

describe('resolveDisagreementWithVisionTiebreaker', () => {
  beforeEach(() => {
    clearOcrRecognitionCacheForTests();
    requestVisionOcrMock.mockReset();
  });

  it('검수가 필요하지 않은 영역은 vision을 호출하지 않고 그대로 둔다', async () => {
    const regions = [consensusRegion('완전 좋아', false)];
    const paddle = paddleProviderReturning([]);

    const result = await resolveDisagreementWithVisionTiebreaker(regions, Buffer.from('image'), paddle);

    expect(requestVisionOcrMock).not.toHaveBeenCalled();
    expect(result).toEqual(regions);
  });

  it('vision이 Luna 쪽 글자에 동의하면 검수 플래그를 풀어준다', async () => {
    const regions = [consensusRegion('멍실멍', true)];
    const paddle = paddleProviderReturning([{ text: '덩실영', confidence: 0.63, polygon: box(54, 17, 133, 44) }]);
    requestVisionOcrMock.mockResolvedValue({ text: '멍실멍', confidence: 0.9, polygon: box(0, 0, 1, 1) });

    const result = await resolveDisagreementWithVisionTiebreaker(regions, Buffer.from('image'), paddle);

    expect(result[0].needsManualReview).toBe(false);
    expect(result[0].text).toBe('멍실멍');
  });

  it('vision이 Paddle 쪽 글자에 동의하면 Paddle 텍스트로 바꾸고 검수를 풀어준다', async () => {
    const regions = [consensusRegion('멍실멍', true)];
    const paddle = paddleProviderReturning([{ text: '덩실영', confidence: 0.63, polygon: box(54, 17, 133, 44) }]);
    requestVisionOcrMock.mockResolvedValue({ text: '덩실영', confidence: 0.9, polygon: box(0, 0, 1, 1) });

    const result = await resolveDisagreementWithVisionTiebreaker(regions, Buffer.from('image'), paddle);

    expect(result[0].needsManualReview).toBe(false);
    expect(result[0].text).toBe('덩실영');
  });

  it('세 엔진이 모두 다르면 여전히 검수로 남긴다', async () => {
    const regions = [consensusRegion('멍실멍', true)];
    const paddle = paddleProviderReturning([{ text: '덩실영', confidence: 0.63, polygon: box(54, 17, 133, 44) }]);
    requestVisionOcrMock.mockResolvedValue({ text: '전혀 다른 문구', confidence: 0.9, polygon: box(0, 0, 1, 1) });

    const result = await resolveDisagreementWithVisionTiebreaker(regions, Buffer.from('image'), paddle);

    expect(result[0].needsManualReview).toBe(true);
    expect(result[0].text).toBe('멍실멍');
  });

  it('vision 호출이 실패하거나(null) 신뢰도가 낮으면 검수 상태를 유지한다', async () => {
    const regions = [consensusRegion('멍실멍', true)];
    const paddle = paddleProviderReturning([{ text: '덩실영', confidence: 0.63, polygon: box(54, 17, 133, 44) }]);
    requestVisionOcrMock.mockResolvedValue(null);

    const result = await resolveDisagreementWithVisionTiebreaker(regions, Buffer.from('image'), paddle);

    expect(result[0].needsManualReview).toBe(true);
  });

  it('vision의 polygon은 절대 결과에 반영하지 않는다(짧은 문구 위치 추정 불신)', async () => {
    const regions = [consensusRegion('멍실멍', true)];
    const originalPolygon = regions[0].polygon;
    const paddle = paddleProviderReturning([{ text: '덩실영', confidence: 0.63, polygon: box(54, 17, 133, 44) }]);
    requestVisionOcrMock.mockResolvedValue({ text: '멍실멍', confidence: 0.9, polygon: box(999, 999, 1000, 1000) });

    const result = await resolveDisagreementWithVisionTiebreaker(regions, Buffer.from('image'), paddle);

    expect(result[0].polygon).toEqual(originalPolygon);
  });
});
