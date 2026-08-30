import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { decodeImagePixels, sampleBorderPixels, sampleTextColor, sampleTextColorFromDecoded } from '../../src/image/background-sampler.js';
import type { FeatherMask } from '../../src/image/mask-generator.js';

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

  it('JPEG 경계의 밝은 회색보다 실제 검은 글자 핵심색을 선택한다', async () => {
    const width = 120;
    const height = 50;
    const raw = fillRaw(width, height, [253, 253, 253]);
    for (let y = 18; y < 32; y += 1) {
      for (let x = 25; x < 95; x += 1) {
        const edge = y === 18 || y === 31 || x === 25 || x === 94;
        raw.set(edge ? [232, 232, 232, 255] : [8, 8, 8, 255], (y * width + x) * 4);
      }
    }
    const image = await sharp(raw, { raw: { width, height, channels: 4 } }).jpeg({ quality: 78 }).toBuffer();
    const decoded = await decodeImagePixels(image);
    const maskData = new Uint8Array(width * height);
    maskData.fill(255);
    for (let y = 16; y < 34; y += 1) for (let x = 23; x < 97; x += 1) maskData[y * width + x] = 0;
    const mask: FeatherMask = { data: maskData, width, height, roi: { x: 20, y: 14, width: 80, height: 22 } };

    const color = sampleTextColorFromDecoded(decoded, { x: 20, y: 14, width: 80, height: 22 }, { r: 253, g: 253, b: 253 }, mask);

    expect(color).not.toBeNull();
    expect(color!.r).toBeLessThan(40);
    expect(color!.g).toBeLessThan(40);
    expect(color!.b).toBeLessThan(40);
  });

  it('글자 마스크 안의 픽셀만 사용해 주변 그림보다 원문 컬러를 우선한다', async () => {
    const width = 48;
    const height = 32;
    const raw = fillRaw(width, height, [244, 182, 190]);
    // OCR 박스 안에 더 넓은 검은 그림 요소가 있어도 마스크에는 빨간 글자 획만 포함한다.
    for (let y = 8; y < 20; y += 1) for (let x = 8; x < 18; x += 1) raw.set([12, 12, 12, 255], (y * width + x) * 4);
    for (let y = 12; y < 16; y += 1) for (let x = 24; x < 36; x += 1) raw.set([238, 82, 94, 255], (y * width + x) * 4);
    const image = await sharp(raw, { raw: { width, height, channels: 4 } }).png().toBuffer();
    const maskData = new Uint8Array(width * height);
    maskData.fill(255);
    for (let y = 12; y < 16; y += 1) for (let x = 24; x < 36; x += 1) maskData[y * width + x] = 0;
    const mask: FeatherMask = { data: maskData, width, height, roi: { x: 4, y: 6, width: 38, height: 18 } };

    const color = sampleTextColorFromDecoded(
      await decodeImagePixels(image),
      { x: 4, y: 6, width: 38, height: 18 },
      { r: 244, g: 182, b: 190 },
      mask,
    );

    expect(color).not.toBeNull();
    expect(color!.r).toBeGreaterThan(220);
    expect(color!.g).toBeLessThan(110);
    expect(color!.b).toBeLessThan(120);
  });
});
