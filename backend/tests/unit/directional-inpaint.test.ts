import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { applyDirectionalInpaint } from '../../src/image/directional-inpaint.js';
import type { FeatherMask } from '../../src/image/mask-generator.js';

const width = 9;
const height = 9;

function gradientImage(): Buffer {
  const raw = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) raw.set([x * 20, y * 20, 80, 255], (y * width + x) * 4);
  }
  for (let y = 3; y <= 5; y += 1) for (let x = 3; x <= 5; x += 1) raw.set([0, 0, 0, 255], (y * width + x) * 4);
  return raw;
}

function textMask(): FeatherMask {
  const data = new Uint8Array(width * height).fill(255);
  for (let y = 3; y <= 5; y += 1) for (let x = 3; x <= 5; x += 1) data[y * width + x] = 0;
  return { data, width, height, roi: { x: 2, y: 2, width: 5, height: 5 } };
}

describe('applyDirectionalInpaint', () => {
  it('masked text pixels are reconstructed from nearby gradient pixels', async () => {
    const source = await sharp(gradientImage(), { raw: { width, height, channels: 4 } }).png().toBuffer();
    const output = await applyDirectionalInpaint(source, { x: 3, y: 3, width: 3, height: 3 }, width, height, textMask());
    const { data } = await sharp(output).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const center = (4 * width + 4) * 4;

    expect(data[center]).toBeGreaterThan(45);
    expect(data[center + 1]).toBeGreaterThan(45);
    expect(data[center + 2]).toBeGreaterThanOrEqual(78);
    expect(data[center + 2]).toBeLessThanOrEqual(82);
  }, 15_000);

  it('does not alter pixels outside the mask', async () => {
    const source = await sharp(gradientImage(), { raw: { width, height, channels: 4 } }).png().toBuffer();
    const output = await applyDirectionalInpaint(source, { x: 3, y: 3, width: 3, height: 3 }, width, height, textMask());
    const { data } = await sharp(output).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

    expect([...data.subarray(0, 4)]).toEqual([0, 0, 80, 255]);
  }, 15_000);
});
