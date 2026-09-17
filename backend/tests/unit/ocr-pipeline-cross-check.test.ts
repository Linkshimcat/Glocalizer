import { describe, expect, it, vi } from 'vitest';
import { crossCheckWithPaddleOcr } from '../../src/ocr/ocr-pipeline.service.js';
import type { ConsensusRegion } from '../../src/ocr/ocr-consensus.service.js';
import type { OcrProvider, RecognizedRegion } from '../../src/ocr/ocr-provider.types.js';

function box(left: number, top: number, right: number, bottom: number) {
  return [{ x: left, y: top }, { x: right, y: top }, { x: right, y: bottom }, { x: left, y: bottom }];
}

function consensusRegion(text: string, needsManualReview = false): ConsensusRegion {
  return { text, confidence: 0.87, polygon: box(54, 17, 133, 44), agreementScore: 1, source: 'paddle-consensus', needsManualReview };
}

function paddleProviderReturning(regions: RecognizedRegion[]): OcrProvider {
  return { name: 'paddle', recognize: vi.fn().mockResolvedValue(regions) };
}

describe('crossCheckWithPaddleOcr', () => {
  it('실사용 재현 사례 — PaddleOCR가 크게 다른 텍스트를 읽으면 검수로 넘긴다', async () => {
    // 실제 프로덕션 재현(2026-09-17): Luna "멍실멍" vs PaddleOCR "덩실영" — 위치는 겹치지만
    // 텍스트가 크게 다르다. 어느 쪽이 맞는지 판단할 근거가 없으므로 자동 승인하지 않는다.
    const luna = [consensusRegion('멍실멍')];
    const paddle = paddleProviderReturning([{ text: '덩실영', confidence: 0.63, polygon: box(50, 15, 130, 45) }]);

    const result = await crossCheckWithPaddleOcr(luna, Buffer.from('image'), paddle);

    expect(result[0].needsManualReview).toBe(true);
    expect(result[0].text).toBe('멍실멍'); // 텍스트 자체는 덮어쓰지 않는다.
  });

  it('PaddleOCR도 같은 텍스트로 동의하면 검수 상태를 바꾸지 않는다', async () => {
    const luna = [consensusRegion('완전 좋아', false)];
    const paddle = paddleProviderReturning([{ text: '완전 좋아', confidence: 0.9, polygon: box(50, 15, 130, 45) }]);

    const result = await crossCheckWithPaddleOcr(luna, Buffer.from('image'), paddle);

    expect(result[0].needsManualReview).toBe(false);
  });

  it('이미 검수 필요로 표시된 영역은 대조 결과와 무관하게 검수 상태를 유지한다', async () => {
    const luna = [consensusRegion('완전 좋아', true)];
    const paddle = paddleProviderReturning([{ text: '완전 좋아', confidence: 0.9, polygon: box(50, 15, 130, 45) }]);

    const result = await crossCheckWithPaddleOcr(luna, Buffer.from('image'), paddle);

    expect(result[0].needsManualReview).toBe(true);
  });

  it('PaddleOCR가 같은 위치에서 아무것도 못 찾으면(겹치는 영역 없음) 대조하지 않는다', async () => {
    const luna = [consensusRegion('완전 좋아')];
    const paddle = paddleProviderReturning([]);

    const result = await crossCheckWithPaddleOcr(luna, Buffer.from('image'), paddle);

    expect(result[0].needsManualReview).toBe(false);
  });

  it('작은 조각(Luna) 하나가 더 큰 병합 박스(PaddleOCR) 안에 완전히 들어있어도 대조한다', async () => {
    // 표준 IoU였다면 놓쳤을 실사용 재현 사례: Luna가 한 캡션을 조각(각 20px 너비)으로 쪼갠
    // 반면 PaddleOCR는 79px짜리 하나로 합쳐서 반환 — IoU는 ~0.25로 CROSS_CHECK_MIN_OVERLAP(0.3)
    // 미달이었지만, 작은 조각은 실제로 큰 박스 안에 완전히 포함돼 있다.
    const luna: ConsensusRegion[] = [{
      text: '멍', confidence: 0.98, polygon: box(80, 17, 99, 45), agreementScore: 1, source: 'paddle-consensus', needsManualReview: false,
    }];
    const paddle = paddleProviderReturning([{ text: '덩실영', confidence: 0.63, polygon: box(54, 17, 133, 44) }]);

    const result = await crossCheckWithPaddleOcr(luna, Buffer.from('image'), paddle);

    expect(result[0].needsManualReview).toBe(true);
  });

  it('PaddleOCR 호출이 실패하면 기존 결과를 그대로 유지한다', async () => {
    const luna = [consensusRegion('완전 좋아')];
    const paddle: OcrProvider = { name: 'paddle', recognize: vi.fn().mockRejectedValue(new Error('bridge down')) };

    const result = await crossCheckWithPaddleOcr(luna, Buffer.from('image'), paddle);

    expect(result[0].needsManualReview).toBe(false);
    expect(result[0].text).toBe('완전 좋아');
  });
});
