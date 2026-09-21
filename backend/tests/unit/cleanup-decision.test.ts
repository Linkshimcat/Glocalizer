import { describe, expect, it } from 'vitest';
import type { DecodedImage } from '../../src/image/background-sampler.js';
import { decideStableCleanup, perturbedBoxes } from '../../src/image/cleanup-decision.js';

const W = 200;
const H = 120;

function decodedImage(fill: (x: number, y: number) => [number, number, number, number]): DecodedImage {
  const data = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) data.set(fill(x, y), (y * W + x) * 4);
  return { data, width: W, height: H, channels: 4 };
}

describe('perturbedBoxes', () => {
  it('원래 박스를 첫 후보로 포함하고 이미지 밖으로 나가지 않는다', () => {
    const boxes = perturbedBoxes({ x: 150, y: 80, width: 60, height: 50 }, W, H);
    expect(boxes[0]).toEqual({ x: 150, y: 80, width: 60, height: 50 });
    for (const box of boxes.slice(1)) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(W);
      expect(box.y + box.height).toBeLessThanOrEqual(H);
    }
  });

  it('너무 작아 흔든 후보가 모두 걸러져도 원래 박스는 남는다', () => {
    expect(perturbedBoxes({ x: 1, y: 1, width: 3, height: 2 }, W, H)).toEqual([{ x: 1, y: 1, width: 3, height: 2 }]);
  });
});

describe('decideStableCleanup', () => {
  it('단색 배경 위 글자는 박스가 살짝 흔들려도 같은 판정이다', () => {
    const image = decodedImage((x, y) => (x >= 70 && x < 130 && y >= 45 && y < 65 ? [0, 0, 0, 255] : [255, 255, 255, 255]));
    for (const shift of [-3, 0, 3]) {
      const { method, stats } = decideStableCleanup(image, { x: 62 + shift, y: 40, width: 76, height: 30 });
      expect(method).toBe('solid-color-fill');
      expect(stats.medianColor).toEqual({ r: 255, g: 255, b: 255 });
    }
  });

  it('투명 배경 스티커는 위쪽 링에 캐릭터가 걸쳐도 박스 위치와 무관하게 투명 판정이다', () => {
    const image = decodedImage((x, y) => {
      if (x >= 70 && x < 130 && y >= 75 && y < 95) return [0, 0, 0, 255]; // 글자
      if (y >= 55 && y < 70 && x >= 40 && x < 160) return [0, 0, 0, 255]; // 글자 위로 붙은 캐릭터 몸통
      return [0, 0, 0, 0];
    });
    for (const dy of [-2, 0, 2]) {
      expect(decideStableCleanup(image, { x: 62, y: 72 + dy, width: 76, height: 26 }).method).toBe('transparent-mask');
    }
  });
});
