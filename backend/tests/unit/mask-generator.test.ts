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

  it('preserves a component disconnected from the OCR box, such as a speech-bubble outline', async () => {
    const raw = pixelBuffer([255, 255, 255, 255], [255, 255, 255, 255]);
    // OCR box(y 8~12)와 떨어진 가로선(y2) = 말풍선 테두리. 박스 글자와 연결되지 않았다.
    for (let x = 6; x < 14; x += 1) raw.set([0, 0, 0, 255], (2 * width + x) * 4);
    for (let y = 8; y < 12; y += 1) for (let x = 9; x < 11; x += 1) raw.set([0, 0, 0, 255], (y * width + x) * 4);
    const buffer = await sharp(raw, { raw: { width, height, channels: 4 } }).png().toBuffer();
    const mask = await generateTextEraseMask(buffer, { x: 8, y: 8, width: 4, height: 4 }, width, height, { mode: 'solid', backgroundColor: { r: 255, g: 255, b: 255 } });
    // 박스와 분리된 성분은 연결성분 필터가 보존한다.
    expect(mask.data[2 * width + 10]).toBeGreaterThan(240);
    expect(mask.data[10 * width + 10]).toBeLessThan(40);
  });

  it('OCR 박스에 일부만 닿는 큰 캐릭터 성분은 글자로 유지하지 않는다', async () => {
    const raw = pixelBuffer([255, 255, 255, 255], [255, 255, 255, 255]);
    // 큰 성분 대부분은 box 위에 있고 맨 아래 한 줄만 box에 닿는다.
    for (let y = 1; y < 9; y += 1) for (let x = 2; x < 7; x += 1) raw.set([0, 0, 0, 255], (y * width + x) * 4);
    for (let y = 9; y < 12; y += 1) for (let x = 9; x < 11; x += 1) raw.set([0, 0, 0, 255], (y * width + x) * 4);
    const buffer = await sharp(raw, { raw: { width, height, channels: 4 } }).png().toBuffer();
    const mask = await generateTextEraseMask(buffer, { x: 5, y: 8, width: 8, height: 5 }, width, height, { mode: 'solid', backgroundColor: { r: 255, g: 255, b: 255 } });

    expect(mask.data[4 * width + 4]).toBeGreaterThan(240);
    expect(mask.data[10 * width + 10]).toBeLessThan(40);
  });

  describe('OCR 박스 밖으로 삐져나간 글자 획', () => {
    const w = 60;
    const h = 140;
    const box = { x: 20, y: 20, width: 20, height: 40 };
    const bg = { r: 255, g: 255, b: 255 };

    function image(paint: (set: (x: number, y: number) => void) => void): Promise<Buffer> {
      const raw = Buffer.alloc(w * h * 4);
      for (let i = 0; i < w * h; i += 1) raw.set([255, 255, 255, 255], i * 4);
      paint((x, y) => raw.set([0, 0, 0, 255], (y * w + x) * 4));
      return sharp(raw, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
    }

    it('박스 아래로 5px 삐져나온 획의 끝까지 지운다(스캔 범위 3px 밖)', async () => {
      const buffer = await image(set => { for (let y = 25; y < 65; y += 1) for (let x = 28; x < 32; x += 1) set(x, y); });
      const mask = await generateTextEraseMask(buffer, box, w, h, { mode: 'solid', backgroundColor: bg });
      expect(mask.data[64 * w + 30]).toBeLessThan(40);
    });

    it('삐져나간 획과 떨어진 아래쪽 성분(캐릭터)은 보존한다', async () => {
      const buffer = await image(set => {
        for (let y = 25; y < 65; y += 1) for (let x = 28; x < 32; x += 1) set(x, y);
        for (let y = 72; y < 90; y += 1) for (let x = 20; x < 40; x += 1) set(x, y);
      });
      const mask = await generateTextEraseMask(buffer, box, w, h, { mode: 'solid', backgroundColor: bg });
      expect(mask.data[80 * w + 30]).toBeGreaterThan(240);
    });

    it('글자에 이어진 긴 몸통이라도 제한 거리 밖은 지우지 않는다', async () => {
      const buffer = await image(set => { for (let y = 25; y < 120; y += 1) for (let x = 28; x < 32; x += 1) set(x, y); });
      const mask = await generateTextEraseMask(buffer, box, w, h, { mode: 'solid', backgroundColor: bg });
      expect(mask.data[110 * w + 30]).toBeGreaterThan(240);
    });
  });

  describe('박스에 걸친 큰 덩어리(캐릭터)', () => {
    const w = 120;
    const h = 100;
    const box = { x: 30, y: 60, width: 60, height: 20 };

    function withCharacterTouchingText(): Promise<Buffer> {
      const raw = Buffer.alloc(w * h * 4);
      for (let i = 0; i < w * h; i += 1) raw.set([0, 0, 0, 0], i * 4);
      // 박스 윗변(y=60)에 아랫부분이 살짝 걸친 큰 캐릭터(y 10~61). 스캔 범위 안에서는 몇 행만 보인다.
      // (폭이 스캔 폭의 85% 미만이라 기존 고밀도 행 절단에는 걸리지 않는다.)
      for (let y = 10; y < 62; y += 1) for (let x = 36; x < 84; x += 1) raw.set([17, 17, 17, 255], (y * w + x) * 4);
      // 캐릭터 바로 밑에서 이어지는 글자 획(외곽선이 캐릭터에 닿은 경우) + 떨어진 글자 획.
      for (let y = 62; y < 76; y += 1) for (let x = 40; x < 44; x += 1) raw.set([30, 30, 30, 255], (y * w + x) * 4);
      for (let y = 66; y < 76; y += 1) for (let x = 60; x < 64; x += 1) raw.set([30, 30, 30, 255], (y * w + x) * 4);
      return sharp(raw, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
    }

    it('글자 획에 이어진 큰 캐릭터의 박스 안팎 조각을 글자로 지우지 않는다', async () => {
      const mask = await generateTextEraseMask(await withCharacterTouchingText(), box, w, h, { mode: 'transparent' });
      expect(mask.data[57 * w + 75]).toBeGreaterThan(240); // 캐릭터 아래쪽 (박스 위)
      expect(mask.data[61 * w + 75]).toBeGreaterThan(240); // 박스 안으로 걸친 조각(글자 획에서 먼 곳)
      expect(mask.data[70 * w + 62]).toBeLessThan(40); // 떨어진 글자 획은 지운다
    });
  });
});
