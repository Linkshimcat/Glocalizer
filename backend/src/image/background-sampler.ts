import sharp from 'sharp';
import type { PixelBox } from '../utils/bbox.js';

export interface BorderStats {
  /** ensureAlpha() 기준이라 원본이 알파 채널이 없으면 항상 255에 가깝다. */
  meanAlpha: number;
  medianColor: { r: number; g: number; b: number };
  /** 채널별 표준편차의 평균 — 낮을수록 배경이 균일한 단색에 가깝다. */
  colorStdDev: number;
  sampledPixelCount: number;
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
    return { meanAlpha, medianColor: { r: 0, g: 0, b: 0 }, colorStdDev: 0, sampledPixelCount: alphas.length };
  }

  const meanR = reds.reduce((sum, v) => sum + v, 0) / reds.length;
  const meanG = greens.reduce((sum, v) => sum + v, 0) / greens.length;
  const meanB = blues.reduce((sum, v) => sum + v, 0) / blues.length;

  const colorStdDev = (stdDev(reds, meanR) + stdDev(greens, meanG) + stdDev(blues, meanB)) / 3;

  return {
    meanAlpha,
    medianColor: { r: Math.round(median(reds)), g: Math.round(median(greens)), b: Math.round(median(blues)) },
    colorStdDev,
    sampledPixelCount: alphas.length,
  };
}
