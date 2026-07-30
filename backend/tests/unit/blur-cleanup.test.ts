import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { applyBlurCleanup } from '../../src/image/blur-cleanup.js';

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 박스 안은 체커보드(글자를 흉내), 박스 밖은 균일한 흰 배경인 합성 이미지를 만든다. */
async function buildCheckerboardImage(width: number, height: number, box: Box): Promise<Buffer> {
  const raw = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const inBox = x >= box.x && x < box.x + box.width && y >= box.y && y < box.y + box.height;
      const isDark = inBox && (Math.floor((x - box.x) / 4) + Math.floor((y - box.y) / 4)) % 2 === 0;
      const value = isDark ? 20 : 255;
      raw.set([value, value, value, 255], (y * width + x) * 4);
    }
  }
  return sharp(raw, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

describe('applyBlurCleanup', () => {
  const width = 120;
  const height = 80;
  const box: Box = { x: 40, y: 25, width: 40, height: 30 };

  it('출력 치수가 입력과 동일하다', async () => {
    const image = await buildCheckerboardImage(width, height, box);

    const result = await applyBlurCleanup(image, box, width, height);
    const metadata = await sharp(result).metadata();

    expect(metadata.width).toBe(width);
    expect(metadata.height).toBe(height);
  });

  it('지정 영역 내부는 블러로 픽셀이 중간값으로 섞여 더 이상 순수 흑/백이 아니다', async () => {
    const image = await buildCheckerboardImage(width, height, box);

    const result = await applyBlurCleanup(image, box, width, height);
    const { data } = await sharp(result).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

    const centerX = box.x + Math.floor(box.width / 2);
    const centerY = box.y + Math.floor(box.height / 2);
    const value = data[(centerY * width + centerX) * 4];

    expect(value).toBeGreaterThan(30);
    expect(value).toBeLessThan(245);
  });

  it('영역에서 충분히 먼 픽셀은 원본과 동일하게 유지된다', async () => {
    const image = await buildCheckerboardImage(width, height, box);

    const result = await applyBlurCleanup(image, box, width, height);
    const { data: originalData } = await sharp(image).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const { data: resultData } = await sharp(result).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

    const cornerIndex = (2 * width + 2) * 4;
    expect(resultData[cornerIndex]).toBe(originalData[cornerIndex]);
    expect(resultData[cornerIndex + 1]).toBe(originalData[cornerIndex + 1]);
    expect(resultData[cornerIndex + 2]).toBe(originalData[cornerIndex + 2]);
  });
});
