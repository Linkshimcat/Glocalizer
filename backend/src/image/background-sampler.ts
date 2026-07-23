import sharp from 'sharp';
import type { PixelBox } from '../utils/bbox.js';

export interface BorderStats {
  /** ensureAlpha() 기준이라 원본이 알파 채널이 없으면 항상 255에 가깝다. */
  meanAlpha: number;
  medianColor: { r: number; g: number; b: number };
  /** 채널별 표준편차의 평균 — 낮을수록 배경이 균일한 단색에 가깝다. */
  colorStdDev: number;
  sampledPixelCount: number;
  /** OCR 영역 내부에서 가장 많이 나타나는 양자화 색상 비율. 말풍선 같은 단색 면 판별에 쓴다. */
  dominantColorRatio: number;
}

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

function clampRect(rect: Rect, imageWidth: number, imageHeight: number): Rect | null {
  const left = Math.max(0, Math.round(rect.left));
  const top = Math.max(0, Math.round(rect.top));
  const right = Math.min(imageWidth, Math.round(rect.left + rect.width));
  const bottom = Math.min(imageHeight, Math.round(rect.top + rect.height));
  const width = right - left;
  const height = bottom - top;
  if (width <= 0 || height <= 0) return null;
  return { left, top, width, height };
}

function borderStrips(box: PixelBox, ringWidth: number, imageWidth: number, imageHeight: number): Rect[] {
  const strips: Rect[] = [
    { left: box.x, top: box.y - ringWidth, width: box.width, height: ringWidth }, // top
    { left: box.x, top: box.y + box.height, width: box.width, height: ringWidth }, // bottom
    { left: box.x - ringWidth, top: box.y, width: ringWidth, height: box.height }, // left
    { left: box.x + box.width, top: box.y, width: ringWidth, height: box.height }, // right
  ];
  return strips
    .map((strip) => clampRect(strip, imageWidth, imageHeight))
    .filter((strip): strip is Rect => strip !== null);
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function stdDev(values: number[], mean: number): number {
  if (values.length === 0) return 0;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/** Bounding Box 바로 바깥 테두리(top/bottom/left/right) 픽셀을 모아 배경 특성을 추정한다. */
export async function sampleBorderPixels(
  buffer: Buffer,
  box: PixelBox,
  imageWidth: number,
  imageHeight: number,
  ringWidth = 8,
): Promise<BorderStats> {
  const strips = borderStrips(box, ringWidth, imageWidth, imageHeight);

  const reds: number[] = [];
  const greens: number[] = [];
  const blues: number[] = [];
  const alphas: number[] = [];

  for (const strip of strips) {
    const { data } = await sharp(buffer).ensureAlpha().extract(strip).raw().toBuffer({ resolveWithObject: true });
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      alphas.push(a);
      if (a > 10) {
        reds.push(data[i]);
        greens.push(data[i + 1]);
        blues.push(data[i + 2]);
      }
    }
  }

  const meanAlpha = alphas.length > 0 ? alphas.reduce((sum, a) => sum + a, 0) / alphas.length : 255;

  if (reds.length === 0) {
    return { meanAlpha, medianColor: { r: 0, g: 0, b: 0 }, colorStdDev: 0, sampledPixelCount: alphas.length, dominantColorRatio: 0 };
  }

  const meanR = reds.reduce((sum, v) => sum + v, 0) / reds.length;
  const meanG = greens.reduce((sum, v) => sum + v, 0) / greens.length;
  const meanB = blues.reduce((sum, v) => sum + v, 0) / blues.length;

  const colorStdDev = (stdDev(reds, meanR) + stdDev(greens, meanG) + stdDev(blues, meanB)) / 3;

  const interior = clampRect({ left: box.x, top: box.y, width: box.width, height: box.height }, imageWidth, imageHeight);
  const buckets = new Map<string, { count: number; r: number; g: number; b: number }>();
  if (interior) {
    const { data } = await sharp(buffer).ensureAlpha().extract(interior).raw().toBuffer({ resolveWithObject: true });
    for (let index = 0; index < data.length; index += 4) {
      if (data[index + 3] < 24) continue;
      const key = `${Math.floor(data[index] / 16)}:${Math.floor(data[index + 1] / 16)}:${Math.floor(data[index + 2] / 16)}`;
      const bucket = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
      bucket.count += 1; bucket.r += data[index]; bucket.g += data[index + 1]; bucket.b += data[index + 2];
      buckets.set(key, bucket);
    }
  }
  const dominant = [...buckets.values()].sort((left, right) => right.count - left.count)[0];
  const interiorCount = [...buckets.values()].reduce((total, bucket) => total + bucket.count, 0);
  const dominantColor = dominant ? { r: Math.round(dominant.r / dominant.count), g: Math.round(dominant.g / dominant.count), b: Math.round(dominant.b / dominant.count) } : null;

  return {
    meanAlpha,
    medianColor: dominantColor ?? { r: Math.round(median(reds)), g: Math.round(median(greens)), b: Math.round(median(blues)) },
    colorStdDev,
    sampledPixelCount: alphas.length,
    dominantColorRatio: dominant && interiorCount > 0 ? dominant.count / interiorCount : 0,
  };
}
