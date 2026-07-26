import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { sampleBorderPixels } from '../../src/image/background-sampler.js';

describe('sampleBorderPixels', () => {
  it('JPEG 노이즈가 있는 단색 패널의 coarse dominant ratio를 유지한다', async () => {
    const width = 40;
    const height = 30;
    const raw = Buffer.alloc(width * height * 4);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const noise = ((x * 17 + y * 13) % 9) - 4;
        raw.set([210 + noise, 200 + noise, 178 + noise, 255], (y * width + x) * 4);
      }
    }
    for (let y = 12; y < 16; y += 1) for (let x = 16; x < 24; x += 1) raw.set([28, 28, 28, 255], (y * width + x) * 4);
    const image = await sharp(raw, { raw: { width, height, channels: 4 } }).jpeg({ quality: 72 }).toBuffer();

    const stats = await sampleBorderPixels(image, { x: 8, y: 8, width: 24, height: 14 }, width, height);

    expect(stats.coarseDominantColorRatio).toBeGreaterThan(0.7);
    expect(stats.medianColor.r).toBeGreaterThan(190);
  });
});
