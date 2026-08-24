import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { decodeImagePixels } from '../../src/image/background-sampler.js';
import { generateAdaptiveTextMask } from '../../src/image/adaptive-text-mask.js';

const width = 80;
const height = 60;

function testImage(): Buffer {
  const pixels = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const shade = 225 + Math.round((x / width) * 20);
      pixels.set([shade, shade, shade, 255], (y * width + x) * 4);
    }
  }
  // OCR bbox 안의 짧은 글자 획 두 개.
  for (let y = 24; y <= 38; y += 1) {
    for (let x = 28; x <= 30; x += 1) pixels.set([20, 20, 20, 255], (y * width + x) * 4);
    for (let x = 45; x <= 47; x += 1) pixels.set([20, 20, 20, 255], (y * width + x) * 4);
  }
  // bbox 밖의 말풍선 외곽선 역할. 마스크에 포함되면 안 된다.
  for (let x = 12; x <= 68; x += 1) pixels.set([20, 20, 20, 255], (12 * width + x) * 4);
  return pixels;
}

describe('generateAdaptiveTextMask', () => {
  it('targets local-contrast text strokes without erasing a disconnected outline', async () => {
    const source = await sharp(testImage(), { raw: { width, height, channels: 4 } }).png().toBuffer();
    const decoded = await decodeImagePixels(source);
    const result = await generateAdaptiveTextMask(decoded, { x: 22, y: 20, width: 34, height: 24 });

    expect(result.mask.data[30 * width + 29]).toBeLessThan(180);
    expect(result.mask.data[12 * width + 30]).toBeGreaterThan(240);
    expect(result.mask.data[2 * width + 2]).toBeGreaterThan(240);
    expect(result.coverage).toBeGreaterThan(0.01);
    expect(result.spillRatio).toBeLessThan(0.45);
  });
});
