import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { mergeCloseRegions } from '../../src/ai/ocr/region-merger.js';
import { classifyConfidence, type OcrRegion } from '../../src/types/ocr.js';

function region(overrides: Partial<OcrRegion> & { box: OcrRegion['box'] }): OcrRegion {
  return {
    id: randomUUID(),
    text: 'text',
    confidence: 0.9,
    confidenceTier: classifyConfidence(overrides.confidence ?? 0.9),
    normalizedBox: overrides.box,
    polygon: [],
    containsKorean: false,
    readingOrder: 0,
    isPrimary: false,
    ...overrides,
  };
}

describe('mergeCloseRegions', () => {
  it('겹치는 영역이 없으면 그대로 둔다', () => {
    const regions = [
      region({ text: '가', box: { x: 0, y: 0, width: 10, height: 10 }, readingOrder: 0 }),
      region({ text: '나', box: { x: 100, y: 100, width: 10, height: 10 }, readingOrder: 1 }),
    ];
    expect(mergeCloseRegions(regions)).toHaveLength(2);
  });

  it('거의 동일한(IoU 높은) 영역은 confidence가 높은 쪽만 남긴다', () => {
    const low = region({ text: '중복', box: { x: 0, y: 0, width: 10, height: 10 }, confidence: 0.6 });
    const high = region({ text: '중복', box: { x: 0.2, y: 0.2, width: 10, height: 10 }, confidence: 0.95 });

    const result = mergeCloseRegions([low, high]);

    expect(result).toHaveLength(1);
    expect(result[0].confidence).toBeCloseTo(0.95);
  });

  it('적당히 겹치는(인접) 영역은 하나로 합치고 텍스트를 이어붙인다', () => {
    // IoU = 70/130 ≈ 0.54 → MERGE_IOU_THRESHOLD(0.3) 이상 DUPLICATE_IOU_THRESHOLD(0.7) 미만 구간
    const first = region({ text: '안녕', box: { x: 0, y: 0, width: 10, height: 10 }, readingOrder: 0 });
    const second = region({ text: '하세요', box: { x: 3, y: 0, width: 10, height: 10 }, readingOrder: 1 });

    const result = mergeCloseRegions([first, second]);

    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('안녕 하세요');
    expect(result[0].box).toEqual({ x: 0, y: 0, width: 13, height: 10 });
  });

  it('결과는 readingOrder 순으로 정렬된다', () => {
    const regions = [
      region({ text: '뒤', box: { x: 200, y: 200, width: 5, height: 5 }, readingOrder: 2 }),
      region({ text: '앞', box: { x: 0, y: 0, width: 5, height: 5 }, readingOrder: 0 }),
    ];
    const result = mergeCloseRegions(regions);
    expect(result.map((r) => r.text)).toEqual(['앞', '뒤']);
  });
});
