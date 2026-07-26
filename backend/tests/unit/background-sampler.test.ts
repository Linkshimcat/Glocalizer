import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { sampleBorderPixels, sampleTextColor } from '../../src/image/background-sampler.js';

function fillRaw(width: number, height: number, color: [number, number, number]): Buffer {
  const raw = Buffer.alloc(width * height * 4);
  for (let i = 0; i < raw.length; i += 4) raw.set([...color, 255], i);
  return raw;
}

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

describe('sampleTextColor', () => {
  it('밝은 배경 위 어두운 글자의 대표색을 검정에 가깝게 추정한다', async () => {
    const width = 40;
    const height = 30;
    const raw = fillRaw(width, height, [210, 200, 178]);
    // 글자 획을 흉내낸 어두운 픽셀 블록 (16x8 = 128px)
    for (let y = 12; y < 20; y += 1) for (let x = 12; x < 28; x += 1) raw.set([30, 30, 34, 255], (y * width + x) * 4);
    const image = await sharp(raw, { raw: { width, height, channels: 4 } }).png().toBuffer();

    const color = await sampleTextColor(image, { x: 10, y: 10, width: 20, height: 12 }, width, height, { r: 210, g: 200, b: 178 });

    expect(color).not.toBeNull();
    expect(color!.r).toBeLessThan(60);
    expect(color!.g).toBeLessThan(60);
    expect(color!.b).toBeLessThan(70);
  });

  it('배경만 있고 글자가 없으면 null을 반환한다', async () => {
    const width = 40;
    const height = 30;
    const image = await sharp(fillRaw(width, height, [210, 200, 178]), { raw: { width, height, channels: 4 } }).png().toBuffer();

    const color = await sampleTextColor(image, { x: 10, y: 10, width: 20, height: 12 }, width, height, { r: 210, g: 200, b: 178 });

    expect(color).toBeNull();
  });
});
