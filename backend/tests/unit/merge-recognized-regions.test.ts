import { describe, expect, it } from 'vitest';
import { mergeAdjacentKoreanRegions } from '../../src/ocr/merge-recognized-regions.js';

function region(text: string, left: number, top: number, right: number, bottom: number) {
  return {
    text,
    confidence: 0.9,
    polygon: [{ x: left, y: top }, { x: right, y: top }, { x: right, y: bottom }, { x: left, y: bottom }],
  };
}

describe('mergeAdjacentKoreanRegions', () => {
  it('같은 줄의 인접한 한글 조각을 하나의 문구로 합친다', () => {
    const merged = mergeAdjacentKoreanRegions([
      region('아자', 10, 20, 50, 50),
      region('스', 55, 21, 75, 50),
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0].text).toBe('아자스');
  });

  it('줄이 다르거나 간격이 먼 문구는 합치지 않는다', () => {
    const merged = mergeAdjacentKoreanRegions([
      region('킹', 10, 10, 30, 30),
      region('받았죠', 100, 10, 160, 30),
      region('아자', 10, 70, 50, 100),
    ]);

    expect(merged.map((value) => value.text)).toEqual(['킹', '받았죠', '아자']);
  });
});
