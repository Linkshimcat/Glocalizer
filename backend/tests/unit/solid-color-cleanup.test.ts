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

  it('배경색 참조 지점이 mask상 글자로 표시돼 있으면 그 픽셀 대신 대표 배경색을 쓴다', async () => {
    // 실제 프로덕션 재현(2026-09-17): OCR 박스가 살짝 타이트해서 글자 획이 배경 참조로 쓰는
    // 지점(box 경계 바로 바깥)까지 침범하면, 원본 픽셀(글자 잉크색)을 "배경색"으로 잘못 믿어
    // 옅은 잔상이 남았다. surroundingBackground의 참조 지점(y=12, bottom 샘플)에 원본 이미지
    // 글자 획이 있어도, mask가 그 지점을 erase(0)로 표시해두면 fallback 색을 써야 한다.
    const pixels = gradientWithText();
    for (let x = 10; x < 14; x += 1) pixels.set([10, 10, 10, 255], (12 * width + x) * 4); // bottom 샘플 지점에도 글자 잉크
    const source = await sharp(pixels, { raw: { width, height, channels: 4 } }).png().toBuffer();

    const mask = textOnlyMask();
    for (let x = 10; x < 14; x += 1) mask.data[12 * width + x] = 0; // mask도 그 지점을 글자로 인식

    const fallback = { r: 200, g: 130, b: 150 };
    const cleaned = await applySolidColorCleanup(source, box, fallback, width, height, mask);
    const { data } = await sharp(cleaned).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

    const base = (7 * width + 11) * 4;
    // 오염된 원본 잉크색(10,10,10)이 아니라 대표 배경색 쪽으로 나와야 한다.
    expect(data[base]).toBeGreaterThan(100);
  });

  it('박스가 말풍선 테두리에 붙어 있어도 테두리 색이 채움색에 번지지 않는다', async () => {
    const w = 30;
    const h = 20;
    const bubbleBox = { x: 6, y: 5, width: 18, height: 10 };
    const pixels = Buffer.alloc(w * h * 4);
    for (let i = 0; i < w * h; i += 1) pixels.set([255, 255, 255, 255], i * 4);
    // 박스 바로 위·아래 참조점(y=3, y=16)에 걸리는 말풍선의 검은 테두리
    for (let x = 0; x < w; x += 1) { pixels.set([0, 0, 0, 255], (3 * w + x) * 4); pixels.set([0, 0, 0, 255], (16 * w + x) * 4); }
    for (let y = 8; y < 12; y += 1) for (let x = 12; x < 18; x += 1) pixels.set([20, 20, 20, 255], (y * w + x) * 4); // 글자
    const mask = new Uint8Array(w * h).fill(255);
    for (let y = 8; y < 12; y += 1) for (let x = 12; x < 18; x += 1) mask[y * w + x] = 0;
    const source = await sharp(pixels, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();

    const cleaned = await applySolidColorCleanup(source, bubbleBox, { r: 255, g: 255, b: 255 }, w, h, { data: mask, width: w, height: h, roi: bubbleBox });
    const { data } = await sharp(cleaned).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let y = 8; y < 12; y += 1) for (let x = 12; x < 18; x += 1) expect(data[(y * w + x) * 4]).toBeGreaterThan(245);
  });
});
