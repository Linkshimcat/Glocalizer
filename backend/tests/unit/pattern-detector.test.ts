import { describe, expect, it } from 'vitest';
import { detectsPeriodicPattern } from '../../src/image/pattern-detector.js';
import type { DecodedImage } from '../../src/image/background-sampler.js';

function buildImage(width: number, height: number, pixel: (x: number, y: number) => number): DecodedImage {
  const data = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const value = pixel(x, y);
      const base = (y * width + x) * 4;
      data[base] = value;
      data[base + 1] = value;
      data[base + 2] = value;
      data[base + 3] = 255;
    }
  }
  return { data, width, height, channels: 4 };
}

const box = { x: 20, y: 20, width: 120, height: 30 };

describe('detectsPeriodicPattern', () => {
  it('세로 줄무늬(가로로 반복)처럼 실제 반복 패턴은 감지한다', () => {
    // 폭 10px 주기의 흑백 세로 줄무늬 — 물방울/체크무늬 배경을 단순화한 대표 사례.
    const image = buildImage(240, 200, (x) => (Math.floor(x / 10) % 2 === 0 ? 40 : 220));

    expect(detectsPeriodicPattern(image, box)).toBe(true);
  });

  it('매끈한 그라디언트는 반복 패턴으로 오탐하지 않는다', () => {
    // 실측에서 발견된 오탐 사례: 자기상관이 lag 내내 높게 유지되지만 트로프+리바운드가 없다.
    const image = buildImage(240, 200, (x, y) => Math.min(255, Math.round((x + y) * 0.4)));

    expect(detectsPeriodicPattern(image, box)).toBe(false);
  });

  it('단색 배경은 분산이 없어 반복 패턴으로 감지되지 않는다', () => {
    const image = buildImage(240, 200, () => 200);

    expect(detectsPeriodicPattern(image, box)).toBe(false);
  });

  it('배경 표본을 뽑을 공간이 없으면(이미지 가장자리) 안전하게 false를 반환한다', () => {
    const image = buildImage(240, 40, (x) => (Math.floor(x / 10) % 2 === 0 ? 40 : 220));
    const edgeBox = { x: 20, y: 0, width: 120, height: 38 };

    expect(detectsPeriodicPattern(image, edgeBox)).toBe(false);
  });
});
