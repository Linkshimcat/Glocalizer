import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { generateTextEraseMask } from '../../src/image/mask-generator.js';

const width = 20;
const height = 20;

function pixelBuffer(background: [number, number, number, number], text: [number, number, number, number]): Buffer {
  const pixels = Buffer.alloc(width * height * 4);
  for (let index = 0; index < width * height; index += 1) pixels.set(background, index * 4);
  for (let y = 8; y < 12; y += 1) for (let x = 8; x < 12; x += 1) pixels.set(text, (y * width + x) * 4);
  return pixels;
}

describe('generateTextEraseMask', () => {
  it('keeps a solid background while targeting only pixels different from it', async () => {
    const buffer = await sharp(pixelBuffer([255, 255, 255, 255], [20, 20, 20, 255]), { raw: { width, height, channels: 4 } }).png().toBuffer();
    const mask = await generateTextEraseMask(buffer, { x: 8, y: 8, width: 4, height: 4 }, width, height, { mode: 'solid', backgroundColor: { r: 255, g: 255, b: 255 } });
    expect(mask.data[10 * width + 10]).toBeLessThan(40);
    expect(mask.data[1 * width + 1]).toBeGreaterThan(240);
  });

  it('uses alpha for transparent images instead of erasing their transparent background', async () => {
    const buffer = await sharp(pixelBuffer([0, 0, 0, 0], [0, 0, 0, 255]), { raw: { width, height, channels: 4 } }).png().toBuffer();
    const mask = await generateTextEraseMask(buffer, { x: 8, y: 8, width: 4, height: 4 }, width, height, { mode: 'transparent' });
    expect(mask.data[10 * width + 10]).toBeLessThan(40);
    expect(mask.data[1 * width + 1]).toBeGreaterThan(240);
  });

  it('preserves a dark component connected to the OCR region boundary, such as a speech-bubble outline', async () => {
    const raw = pixelBuffer([255, 255, 255, 255], [255, 255, 255, 255]);
    for (let x = 6; x < 14; x += 1) raw.set([0, 0, 0, 255], (6 * width + x) * 4);
    for (let y = 8; y < 12; y += 1) for (let x = 9; x < 11; x += 1) raw.set([0, 0, 0, 255], (y * width + x) * 4);
    const buffer = await sharp(raw, { raw: { width, height, channels: 4 } }).png().toBuffer();
    const mask = await generateTextEraseMask(buffer, { x: 8, y: 8, width: 4, height: 4 }, width, height, { mode: 'solid', backgroundColor: { r: 255, g: 255, b: 255 } });
    expect(mask.data[6 * width + 10]).toBeGreaterThan(240);
    expect(mask.data[10 * width + 10]).toBeLessThan(40);
  });
});
