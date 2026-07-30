import sharp from 'sharp';
import type { PixelBox } from '../utils/bbox.js';
import { generateTextEraseMask, type FeatherMask } from './mask-generator.js';

/** box 영역의 알파를 0으로 만들되(feather 처리), RGB는 그대로 둔다. */
export async function applyTransparentCleanup(
  buffer: Buffer,
  box: PixelBox,
  imageWidth: number,
  imageHeight: number,
  existingMask?: FeatherMask,
): Promise<Buffer> {
  const mask = existingMask ?? await generateTextEraseMask(buffer, box, imageWidth, imageHeight, { mode: 'transparent' });

  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const channels = info.channels;
  const pixelCount = imageWidth * imageHeight;
  const out = Buffer.from(data);

  for (let i = 0; i < pixelCount; i += 1) {
    const alphaIndex = i * channels + 3;
    out[alphaIndex] = Math.round((out[alphaIndex] * mask.data[i]) / 255);
  }

  return sharp(out, { raw: { width: imageWidth, height: imageHeight, channels } }).png().toBuffer();
}
