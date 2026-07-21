import sharp from 'sharp';
import type { PixelBox } from '../utils/bbox.js';
import { generateFeatheredEraseMask } from './mask-generator.js';

const FEATHER_PX = 4;

/** box 영역을 fillColor로 채우되, mask 값(0=완전 채움, 255=원본 유지)으로 경계를 선형 블렌딩해 부드럽게 만든다. */
export async function applySolidColorCleanup(
  buffer: Buffer,
  box: PixelBox,
  fillColor: { r: number; g: number; b: number },
  imageWidth: number,
  imageHeight: number,
): Promise<Buffer> {
  const mask = await generateFeatheredEraseMask(box, imageWidth, imageHeight, FEATHER_PX);

  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const channels = info.channels;
  const pixelCount = imageWidth * imageHeight;
  const out = Buffer.from(data);
  const fill = [fillColor.r, fillColor.g, fillColor.b];

  for (let i = 0; i < pixelCount; i += 1) {
    const keepWeight = mask.data[i] / 255; // 1 = 원본 그대로, 0 = fillColor로 완전 대체
    const base = i * channels;
    for (let c = 0; c < 3; c += 1) {
      out[base + c] = Math.round(out[base + c] * keepWeight + fill[c] * (1 - keepWeight));
    }
  }

  return sharp(out, { raw: { width: imageWidth, height: imageHeight, channels } }).png().toBuffer();
}
