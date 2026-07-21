import { describe, expect, it } from 'vitest';
import { normalizeOcrRegions } from '../../src/ai/ocr/ocr-normalizer.js';
import type { RawTextDetection } from '../../src/ai/nvidia/nvidia.types.js';

function detection(text: string, confidence: number, box: { x: number; y: number; width: number; height: number }): RawTextDetection {
  const { x, y, width, height } = box;
  return {
    text_prediction: { text, confidence },
    bounding_box: {
      points: [
        { x, y },
        { x: x + width, y },
        { x: x + width, y: y + height },
        { x, y: y + height },
      ],
    },
  };
}

describe('normalizeOcrRegions', () => {
  it('실제 Nemotron OCR 응답 형태를 OcrRegion으로 변환한다', () => {
    const detections = [detection('열공', 0.94, { x: 0.1, y: 0.2, width: 0.3, height: 0.1 })];

    const [region] = normalizeOcrRegions(detections, { imageWidth: 400, imageHeight: 200 });

    expect(region.text).toBe('열공');
    expect(region.confidence).toBeCloseTo(0.94);
    expect(region.confidenceTier).toBe('auto-approved');
    expect(region.containsKorean).toBe(true);
    // normalizedBox는 padding 영향을 받지 않는다.
    expect(region.normalizedBox.x).toBeCloseTo(0.1);
    expect(region.normalizedBox.y).toBeCloseTo(0.2);
    expect(region.normalizedBox.width).toBeCloseTo(0.3);
    expect(region.normalizedBox.height).toBeCloseTo(0.1);
    // pixelBox = normalizedBox * imageSize, 그리고 4px padding.
    expect(region.box.x).toBeCloseTo(0.1 * 400 - 4);
    expect(region.box.y).toBeCloseTo(0.2 * 200 - 4);
  });

  it('빈 텍스트는 걸러낸다', () => {
    const detections = [detection('   ', 0.9, { x: 0, y: 0, width: 0.1, height: 0.1 })];
    expect(normalizeOcrRegions(detections, { imageWidth: 100, imageHeight: 100 })).toHaveLength(0);
  });

  it('폴리곤이 없는 감지 결과는 걸러낸다', () => {
    const detections: RawTextDetection[] = [{ text_prediction: { text: '텍스트', confidence: 0.9 }, bounding_box: { points: [] } }];
    expect(normalizeOcrRegions(detections, { imageWidth: 100, imageHeight: 100 })).toHaveLength(0);
  });

  it('이미지 경계를 벗어나는 박스는 클램프된다', () => {
    const detections = [detection('가장자리', 0.9, { x: 0, y: 0, width: 0.05, height: 0.05 })];
    const [region] = normalizeOcrRegions(detections, { imageWidth: 100, imageHeight: 100 });
    expect(region.box.x).toBeGreaterThanOrEqual(0);
    expect(region.box.y).toBeGreaterThanOrEqual(0);
  });

  it('confidence 구간에 따라 confidenceTier를 매긴다', () => {
    const cases: Array<[number, string]> = [
      [0.95, 'auto-approved'],
      [0.8, 'caution'],
      [0.6, 'needs-review'],
      [0.3, 'likely-failed'],
    ];

    for (const [confidence, tier] of cases) {
      const [region] = normalizeOcrRegions([detection('x', confidence, { x: 0, y: 0, width: 0.1, height: 0.1 })], {
        imageWidth: 100,
        imageHeight: 100,
      });
      expect(region.confidenceTier).toBe(tier);
    }
  });

  it('readingOrder는 입력 배열 순서를 따른다', () => {
    const detections = [
      detection('첫번째', 0.9, { x: 0, y: 0, width: 0.1, height: 0.1 }),
      detection('두번째', 0.9, { x: 0.5, y: 0.5, width: 0.1, height: 0.1 }),
    ];
    const regions = normalizeOcrRegions(detections, { imageWidth: 100, imageHeight: 100 });
    expect(regions.map((r) => r.readingOrder)).toEqual([0, 1]);
  });
});
