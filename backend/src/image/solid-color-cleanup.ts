import sharp from 'sharp';
import type { PixelBox } from '../utils/bbox.js';
import { generateTextEraseMask, type FeatherMask } from './mask-generator.js';

interface Rgb {
  r: number;
  g: number;
  b: number;
}

function pixelRgb(data: Buffer, width: number, channels: number, x: number, y: number): Rgb {
  const base = (y * width + x) * channels;
  return { r: data[base], g: data[base + 1], b: data[base + 2] };
}

function mix(left: Rgb, right: Rgb, ratio: number): Rgb {
  return {
    r: left.r + (right.r - left.r) * ratio,
    g: left.g + (right.g - left.g) * ratio,
    b: left.b + (right.b - left.b) * ratio,
  };
}

/** OCR 박스 바깥의 좌우·상하 픽셀을 보간해 글자 아래의 배경색을 추정한다. */
function surroundingBackground(
  data: Buffer,
  width: number,
  height: number,
  channels: number,
  box: PixelBox,
  x: number,
  y: number,
  fallback: Rgb,
): Rgb {
  const left = Math.max(0, Math.floor(box.x) - 2);
  const right = Math.min(width - 1, Math.ceil(box.x + box.width) + 1);
  const top = Math.max(0, Math.floor(box.y) - 2);
  const bottom = Math.min(height - 1, Math.ceil(box.y + box.height) + 1);
  if (left >= right || top >= bottom) return fallback;

  const clampedX = Math.max(left, Math.min(right, x));
  const clampedY = Math.max(top, Math.min(bottom, y));
  const horizontal = mix(
    pixelRgb(data, width, channels, left, clampedY),
    pixelRgb(data, width, channels, right, clampedY),
    (clampedX - left) / (right - left),
  );
  const vertical = mix(
    pixelRgb(data, width, channels, clampedX, top),
    pixelRgb(data, width, channels, clampedX, bottom),
    (clampedY - top) / (bottom - top),
  );
  return mix(horizontal, vertical, 0.5);
}

/** box 영역을 fillColor로 채우되, mask 값(0=완전 채움, 255=원본 유지)으로 경계를 선형 블렌딩해 부드럽게 만든다. */
export async function applySolidColorCleanup(
  buffer: Buffer,
  box: PixelBox,
  fillColor: { r: number; g: number; b: number },
  imageWidth: number,
  imageHeight: number,
  existingMask?: FeatherMask,
): Promise<Buffer> {
  const mask = existingMask ?? await generateTextEraseMask(buffer, box, imageWidth, imageHeight, { mode: 'solid', backgroundColor: fillColor });

  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const channels = info.channels;
  const pixelCount = imageWidth * imageHeight;
  const out = Buffer.from(data);

  for (let i = 0; i < pixelCount; i += 1) {
    const keepWeight = mask.data[i] / 255; // 1 = 원본 그대로, 0 = fillColor로 완전 대체
    if (keepWeight >= 1) continue;
    const base = i * channels;
    const x = i % imageWidth;
    const y = (i - x) / imageWidth;
    const fill = surroundingBackground(data, imageWidth, imageHeight, channels, box, x, y, fillColor);
    const fillChannels = [fill.r, fill.g, fill.b];
    for (let c = 0; c < 3; c += 1) {
      out[base + c] = Math.round(out[base + c] * keepWeight + fillChannels[c] * (1 - keepWeight));
    }
  }

  return sharp(out, { raw: { width: imageWidth, height: imageHeight, channels } }).png().toBuffer();
}
