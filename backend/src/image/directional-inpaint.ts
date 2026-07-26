import sharp from 'sharp';
import type { PixelBox } from '../utils/bbox.js';
import type { FeatherMask } from './mask-generator.js';

const SOURCE_MASK_THRESHOLD = 232;

interface PixelSample {
  offset: number;
  distance: number;
}

function colorDifference(data: Buffer, left: number, right: number, channels: number): number {
  return Math.hypot(
    data[left] - data[right],
    data[left + 1] - data[right + 1],
    data[left + 2] - data[right + 2],
  ) / Math.max(1, channels);
}

function findSourceAlongAxis(
  mask: FeatherMask,
  x: number,
  y: number,
  deltaX: number,
  deltaY: number,
  maxDistance: number,
): PixelSample | null {
  for (let distance = 1; distance <= maxDistance; distance += 1) {
    const sourceX = x + deltaX * distance;
    const sourceY = y + deltaY * distance;
    if (sourceX < 0 || sourceX >= mask.width || sourceY < 0 || sourceY >= mask.height) return null;
    const offset = sourceY * mask.width + sourceX;
    if (mask.data[offset] >= SOURCE_MASK_THRESHOLD) return { offset, distance };
  }
  return null;
}

function interpolatePair(data: Buffer, first: PixelSample, second: PixelSample, channels: number): number[] {
  const firstWeight = second.distance / (first.distance + second.distance);
  const secondWeight = 1 - firstWeight;
  return Array.from({ length: channels }, (_, channel) => Math.round(data[first.offset * channels + channel] * firstWeight + data[second.offset * channels + channel] * secondWeight));
}

function sampleInpaintColor(data: Buffer, mask: FeatherMask, x: number, y: number, channels: number, maxDistance: number): number[] | null {
  const left = findSourceAlongAxis(mask, x, y, -1, 0, maxDistance);
  const right = findSourceAlongAxis(mask, x, y, 1, 0, maxDistance);
  const up = findSourceAlongAxis(mask, x, y, 0, -1, maxDistance);
  const down = findSourceAlongAxis(mask, x, y, 0, 1, maxDistance);
  const pairs = [
    left && right ? { value: interpolatePair(data, left, right, channels), difference: colorDifference(data, left.offset * channels, right.offset * channels, channels) } : null,
    up && down ? { value: interpolatePair(data, up, down, channels), difference: colorDifference(data, up.offset * channels, down.offset * channels, channels) } : null,
  ].filter((candidate): candidate is { value: number[]; difference: number } => candidate !== null);

  if (pairs.length > 0) return pairs.sort((first, second) => first.difference - second.difference)[0].value;

  const nearest = [left, right, up, down]
    .filter((candidate): candidate is PixelSample => candidate !== null)
    .sort((first, second) => first.distance - second.distance)[0];
  if (!nearest) return null;
  return Array.from({ length: channels }, (_, channel) => data[nearest.offset * channels + channel]);
}

/**
 * 글자 마스크 안쪽만, 주변의 보존된 픽셀을 같은 행/열 방향으로 보간해 메운다.
 * 사진·그라데이션에서 단색 덮어쓰기보다 자연스럽지만, 복잡도가 높은 배경은 호출 전에
 * manual-required로 차단해야 한다.
 */
export async function applyDirectionalInpaint(
  buffer: Buffer,
  box: PixelBox,
  imageWidth: number,
  imageHeight: number,
  mask: FeatherMask,
): Promise<Buffer> {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);
  const maxDistance = Math.max(4, Math.min(24, Math.ceil(Math.max(box.width, box.height) * 0.14)));
  const left = Math.max(0, Math.floor(mask.roi.x));
  const top = Math.max(0, Math.floor(mask.roi.y));
  const right = Math.min(imageWidth, Math.ceil(mask.roi.x + mask.roi.width));
  const bottom = Math.min(imageHeight, Math.ceil(mask.roi.y + mask.roi.height));

  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) {
      const index = y * imageWidth + x;
      const eraseWeight = 1 - mask.data[index] / 255;
      if (eraseWeight <= 0) continue;
      const replacement = sampleInpaintColor(data, mask, x, y, info.channels, maxDistance);
      if (!replacement) continue;
      const base = index * info.channels;
      for (let channel = 0; channel < info.channels; channel += 1) {
        out[base + channel] = Math.round(data[base + channel] * (1 - eraseWeight) + replacement[channel] * eraseWeight);
      }
    }
  }

  return sharp(out, { raw: { width: imageWidth, height: imageHeight, channels: info.channels } }).png().toBuffer();
}
