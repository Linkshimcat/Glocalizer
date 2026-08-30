import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { applySolidColorCleanup } from '../../src/image/solid-color-cleanup.js';
import type { FeatherMask } from '../../src/image/mask-generator.js';

const width = 24;
const height = 16;
const box = { x: 8, y: 5, width: 8, height: 6 };

function gradientWithText(): Buffer {
  const pixels = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const base = (y * width + x) * 4;
      pixels.set([180 + x * 2, 120 + x, 140 + x, 255], base);
    }
  }
  for (let y = 7; y < 9; y += 1) {
    for (let x = 10; x < 14; x += 1) pixels.set([10, 10, 10, 255], (y * width + x) * 4);
  }
  return pixels;
}

function textOnlyMask(): FeatherMask {
  const data = new Uint8Array(width * height);
  data.fill(255);
  for (let y = 7; y < 9; y += 1) for (let x = 10; x < 14; x += 1) data[y * width + x] = 0;
  return { data, width, height, roi: box };
}

describe('applySolidColorCleanup', () => {
  it('OCR 주변 픽셀을 보간해 완만한 배경 그라데이션을 유지한다', async () => {
    const source = await sharp(gradientWithText(), { raw: { width, height, channels: 4 } }).png().toBuffer();
    const cleaned = await applySolidColorCleanup(source, box, { r: 200, g: 130, b: 150 }, width, height, textOnlyMask());
    const { data } = await sharp(cleaned).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

    for (let x = 10; x < 14; x += 1) {
      const base = (7 * width + x) * 4;
      expect(data[base]).toBeCloseTo(180 + x * 2, -1);
      expect(data[base + 1]).toBeCloseTo(120 + x, -1);
      expect(data[base + 2]).toBeCloseTo(140 + x, -1);
    }
    const untouched = (2 * width + 2) * 4;
    expect([...data.subarray(untouched, untouched + 4)]).toEqual([184, 122, 142, 255]);
  });
});
