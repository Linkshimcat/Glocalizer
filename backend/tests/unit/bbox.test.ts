import { describe, expect, it } from 'vitest';
import {
  boxArea,
  boxCenter,
  intersectionOverUnion,
  normalizedToPixel,
  padAndClampBox,
  polygonToBox,
} from '../../src/utils/bbox.js';

describe('polygonToBox', () => {
  it('4점 폴리곤에서 axis-aligned bounding box를 뽑는다', () => {
    const box = polygonToBox([
      { x: 0.1, y: 0.2 },
      { x: 0.4, y: 0.2 },
      { x: 0.4, y: 0.5 },
      { x: 0.1, y: 0.5 },
    ]);
    expect(box.x).toBeCloseTo(0.1);
    expect(box.y).toBeCloseTo(0.2);
    expect(box.width).toBeCloseTo(0.3);
    expect(box.height).toBeCloseTo(0.3);
  });
});

describe('normalizedToPixel', () => {
  it('정규화 좌표를 이미지 크기에 맞춰 픽셀로 변환한다', () => {
    const box = normalizedToPixel({ x: 0.5, y: 0.25, width: 0.1, height: 0.2 }, 200, 400);
    expect(box).toEqual({ x: 100, y: 100, width: 20, height: 80 });
  });
});

describe('padAndClampBox', () => {
  it('padding을 더하되 이미지 경계를 벗어나지 않는다', () => {
    const box = padAndClampBox({ x: 2, y: 2, width: 10, height: 10 }, 5, 100, 100);
    expect(box).toEqual({ x: 0, y: 0, width: 17, height: 17 });
  });

  it('이미지 크기를 넘는 쪽도 클램프한다', () => {
    const box = padAndClampBox({ x: 90, y: 90, width: 10, height: 10 }, 5, 100, 100);
    expect(box.x + box.width).toBeLessThanOrEqual(100);
    expect(box.y + box.height).toBeLessThanOrEqual(100);
  });
});

describe('boxArea / boxCenter', () => {
  it('면적과 중심점을 계산한다', () => {
    const box = { x: 10, y: 20, width: 30, height: 40 };
    expect(boxArea(box)).toBe(1200);
    expect(boxCenter(box)).toEqual({ x: 25, y: 40 });
  });
});

describe('intersectionOverUnion', () => {
  it('완전히 겹치는 두 박스는 IoU=1', () => {
    const box = { x: 0, y: 0, width: 10, height: 10 };
    expect(intersectionOverUnion(box, box)).toBeCloseTo(1);
  });

  it('전혀 겹치지 않으면 IoU=0', () => {
    const a = { x: 0, y: 0, width: 10, height: 10 };
    const b = { x: 100, y: 100, width: 10, height: 10 };
    expect(intersectionOverUnion(a, b)).toBe(0);
  });

  it('절반씩 겹치는 경우를 정확히 계산한다', () => {
    const a = { x: 0, y: 0, width: 10, height: 10 };
    const b = { x: 5, y: 0, width: 10, height: 10 };
    // intersection=5*10=50, union=100+100-50=150
    expect(intersectionOverUnion(a, b)).toBeCloseTo(50 / 150);
  });
});
