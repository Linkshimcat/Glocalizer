import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { selectPrimaryRegion } from '../../src/ai/ocr/primary-region-selector.js';
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

describe('selectPrimaryRegion', () => {
  it('빈 배열은 그대로 반환한다', () => {
    expect(selectPrimaryRegion([], 100, 100)).toEqual([]);
  });

  it('한글을 포함한 영역을 영어만 있는 영역보다 우선한다', () => {
    const korean = region({ containsKorean: true, confidence: 0.7, box: { x: 40, y: 40, width: 10, height: 10 } });
    const english = region({ containsKorean: false, confidence: 0.99, box: { x: 40, y: 40, width: 10, height: 10 } });

    const [result1, result2] = selectPrimaryRegion([english, korean], 100, 100);
    expect(result1.isPrimary).toBe(false);
    expect(result2.isPrimary).toBe(true);
  });

  it('같은 조건이면 confidence가 높은 쪽을 고른다', () => {
    const low = region({ containsKorean: true, confidence: 0.5, box: { x: 40, y: 40, width: 10, height: 10 } });
    const high = region({ containsKorean: true, confidence: 0.95, box: { x: 40, y: 40, width: 10, height: 10 } });

    const result = selectPrimaryRegion([low, high], 100, 100);
    expect(result.find((r) => r.confidence === 0.95)?.isPrimary).toBe(true);
  });

  it('같은 조건이면 이미지 중심에 가깝고 하단에 있는 영역을 선호한다', () => {
    const corner = region({ containsKorean: true, confidence: 0.9, box: { x: 0, y: 0, width: 10, height: 10 } });
    const centerBottom = region({ containsKorean: true, confidence: 0.9, box: { x: 45, y: 60, width: 10, height: 10 } });

    const result = selectPrimaryRegion([corner, centerBottom], 100, 100);
    expect(result.find((r) => r.box.x === 45)?.isPrimary).toBe(true);
  });

  it('정확히 하나만 isPrimary=true가 된다', () => {
    const regions = [
      region({ box: { x: 0, y: 0, width: 10, height: 10 } }),
      region({ box: { x: 20, y: 20, width: 10, height: 10 } }),
      region({ box: { x: 40, y: 40, width: 10, height: 10 } }),
    ];
    const result = selectPrimaryRegion(regions, 100, 100);
    expect(result.filter((r) => r.isPrimary)).toHaveLength(1);
  });
});
