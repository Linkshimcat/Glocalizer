import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { prepareImageForVision } from '../../src/image/vision-image-preprocessor.js';

describe('prepareImageForVision', () => {
  it('불투명 이미지는 JPEG로 바꾸고 최대 변을 제한한다', async () => {
    const source = await sharp({ create: { width: 3200, height: 1200, channels: 3, background: '#ffffff' } }).png().toBuffer();

    const result = await prepareImageForVision(source, 1600);
    const metadata = await sharp(result.content).metadata();

    expect(result.mimeType).toBe('image/jpeg');
    expect(Math.max(metadata.width ?? 0, metadata.height ?? 0)).toBe(1600);
  });

  it('작은 투명 이미지는 alpha를 보존한 채 OCR용 크기로 확대한다', async () => {
    const source = await sharp({ create: { width: 200, height: 100, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();

    const result = await prepareImageForVision(source, 1600);
    const metadata = await sharp(result.content).metadata();

    expect(result.mimeType).toBe('image/png');
    expect(metadata.hasAlpha).toBe(true);
    expect(metadata.width).toBe(1024);
    expect(metadata.height).toBe(512);
  });
});
