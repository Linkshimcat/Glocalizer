import { describe, expect, it } from 'vitest';
import { analyzeBackground, fitBackgroundModel, positionNoise } from '../../src/image/background-model.js';
import type { DecodedImage } from '../../src/image/background-sampler.js';

const width = 60;
const height = 50;
const box = { x: 20, y: 18, width: 16, height: 14 };

function makeImage(colorAt: (x: number, y: number) => [number, number, number]): DecodedImage {
  const channels = 4;
  const data = Buffer.alloc(width * height * channels);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [r, g, b] = colorAt(x, y);
      const base = (y * width + x) * channels;
      data.set([Math.round(r), Math.round(g), Math.round(b), 255], base);
    }
  }
  return { data, width, height, channels };
}

describe('fitBackgroundModel', () => {
  it('완만한 그라데이션은 위치별 색을 정확히 예측한다', () => {
    const image = makeImage((x, y) => [x * 3, 40 + y * 2, 200 - x]);
    const model = fitBackgroundModel(image, box);
    expect(model).not.toBeNull();
    const [r, g, b] = model!.at(30, 25);
    expect(r).toBeCloseTo(90, 0);
    expect(g).toBeCloseTo(90, 0);
    expect(b).toBeCloseTo(170, 0);
    expect(model!.noiseSigma).toBeLessThan(5);
  });

  it('거의 단색인 배경은 null을 돌려줘 기존 단색 경로를 쓰게 한다', () => {
    const image = makeImage(() => [120, 130, 140]);
    expect(fitBackgroundModel(image, box)).toBeNull();
  });

  it('글자 획이 링 일부에 걸쳐도(아웃라이어) 평면을 안정적으로 맞춘다', () => {
    const image = makeImage((x, y) => {
      // 박스 바로 왼쪽 바깥(글자 획 일부가 침범한 상황)을 어둡게 오염시킨다.
      if (x >= box.x - 4 && x < box.x && y >= box.y && y < box.y + box.height) return [10, 10, 10];
      return [x * 3, 40 + y * 2, 200 - x];
    });
    const { model, outlierRatio } = analyzeBackground(image, box);
    expect(model).not.toBeNull();
    const [r] = model!.at(30, 25);
    expect(r).toBeCloseTo(90, 0);
    expect(outlierRatio).toBeGreaterThan(0);
  });
});

describe('positionNoise', () => {
  it('같은 좌표·채널이면 항상 같은 값을 돌려준다(결정적)', () => {
    expect(positionNoise(12, 34, 1)).toBe(positionNoise(12, 34, 1));
  });

  it('좌표가 다르면 대체로 다른 값이 나온다', () => {
    expect(positionNoise(1, 1, 0)).not.toBe(positionNoise(2, 2, 0));
  });
});
