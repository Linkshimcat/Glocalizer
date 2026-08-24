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

  it('가로로 살짝 겹치는 같은 줄 한글 조각도 합친다 ("왕"|"피"처럼 붙은 글자)', () => {
    // 실제 "왕 피곤" OCR에서 나온 좌표(960px 기준): "왕"과 "피" 박스가 6px 겹쳐 있었다.
    const merged = mergeAdjacentKoreanRegions([
      region('왕', 197, 261, 407, 484),
      region('피', 401, 286, 587, 444),
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0].text).toBe('왕피');
  });

  it('줄이 다르거나 간격이 먼 문구는 합치지 않는다', () => {
    const merged = mergeAdjacentKoreanRegions([
      region('킹', 10, 10, 30, 30),
      region('받았죠', 100, 10, 160, 30),
      region('아자', 10, 70, 50, 100),
    ]);

    expect(merged.map((value) => value.text)).toEqual(['킹', '받았죠', '아자']);
  });

  it('줄바꿈으로 두 줄에 걸친 같은 캡션을 하나의 영역으로 이어 붙인다', () => {
    const merged = mergeAdjacentKoreanRegions([
      region('오늘도', 10, 10, 90, 40),
      region('힘내자', 12, 44, 92, 74),
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0].text).toBe('오늘도 힘내자');
  });

  it('세로 간격은 가깝지만 좌우로 겹치지 않는 두 영역은 합치지 않는다', () => {
    const merged = mergeAdjacentKoreanRegions([
      region('왼쪽줄', 10, 10, 80, 40),
      region('오른쪽줄', 200, 44, 280, 74),
    ]);

    expect(merged.map((value) => value.text)).toEqual(['왼쪽줄', '오른쪽줄']);
  });

  it('세로 간격이 줄 높이보다 훨씬 먼 두 영역(다른 말풍선)은 합치지 않는다', () => {
    const merged = mergeAdjacentKoreanRegions([
      region('자책', 10, 10, 90, 40),
      region('그', 10, 200, 50, 240),
    ]);

    expect(merged.map((value) => value.text)).toEqual(['자책', '그']);
  });

  it('세로로 가까이 쌓인 별개 캡션은 합치지 않고 실제 줄바꿈만 병합한다', () => {
    const merged = mergeAdjacentKoreanRegions([
      region('잼얘 요구권', 120, 60, 400, 100),
      region('잼얘요구권', 130, 112, 390, 152),
      region('잼얘해줘', 150, 172, 370, 212),
      region('당신이 잼얘를 끊어온지 오래됐기 때문에', 90, 300, 430, 335),
      region('제 도파민이 줄어들었습니다 잼얘를 요구합니다', 110, 342, 410, 377),
    ]);

    expect(merged.map((value) => value.text)).toEqual([
      '잼얘 요구권',
      '잼얘요구권',
      '잼얘해줘',
      '당신이 잼얘를 끊어온지 오래됐기 때문에 제 도파민이 줄어들었습니다 잼얘를 요구합니다',
    ]);
  });
});
