import sharp from 'sharp';
import type { PixelBox } from '../utils/bbox.js';
import type { FeatherMask } from './mask-generator.js';

export interface BorderStats {
  /** ensureAlpha() 기준이라 원본이 알파 채널이 없으면 항상 255에 가깝다. */
  meanAlpha: number;
  medianColor: { r: number; g: number; b: number };
  /** 채널별 표준편차의 평균 — 낮을수록 배경이 균일한 단색에 가깝다. */
  colorStdDev: number;
  sampledPixelCount: number;
  /** OCR 영역 내부에서 가장 많이 나타나는 양자화 색상 비율. 말풍선 같은 단색 면 판별에 쓴다. */
  dominantColorRatio: number;
  /** JPEG 노이즈를 흡수한 32단계 양자화 지배 비율. 넓은 말풍선·단색 패널 보조 판별용이다. */
  coarseDominantColorRatio: number;
}

export interface DecodedImage {
  data: Buffer;
  width: number;
  height: number;
  channels: number;
}

export async function decodeImagePixels(buffer: Buffer): Promise<DecodedImage> {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height, channels: info.channels };
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
  _imageWidth: number,
  _imageHeight: number,
  ringWidth = 8,
): Promise<BorderStats> {
  return sampleBorderPixelsFromDecoded(await decodeImagePixels(buffer), box, ringWidth);
}

export function sampleBorderPixelsFromDecoded(
  image: DecodedImage,
  box: PixelBox,
  ringWidth = 8,
): BorderStats {
  const imageWidth = image.width;
  const imageHeight = image.height;
  const strips = borderStrips(box, ringWidth, imageWidth, imageHeight);

  const reds: number[] = [];
  const greens: number[] = [];
  const blues: number[] = [];
  const alphas: number[] = [];

  for (const strip of strips) {
    for (let y = strip.top; y < strip.top + strip.height; y += 1) {
      for (let x = strip.left; x < strip.left + strip.width; x += 1) {
        const base = (y * imageWidth + x) * image.channels;
        const a = image.data[base + 3];
        alphas.push(a);
        if (a > 10) {
          reds.push(image.data[base]);
          greens.push(image.data[base + 1]);
          blues.push(image.data[base + 2]);
        }
      }
    }
  }

  const meanAlpha = alphas.length > 0 ? alphas.reduce((sum, a) => sum + a, 0) / alphas.length : 255;

  if (reds.length === 0) {
    return {
      meanAlpha,
      medianColor: { r: 0, g: 0, b: 0 },
      colorStdDev: 0,
      sampledPixelCount: alphas.length,
      dominantColorRatio: 0,
      coarseDominantColorRatio: 0,
    };
  }

  const meanR = reds.reduce((sum, v) => sum + v, 0) / reds.length;
  const meanG = greens.reduce((sum, v) => sum + v, 0) / greens.length;
  const meanB = blues.reduce((sum, v) => sum + v, 0) / blues.length;

  const colorStdDev = (stdDev(reds, meanR) + stdDev(greens, meanG) + stdDev(blues, meanB)) / 3;

  const interior = clampRect({ left: box.x, top: box.y, width: box.width, height: box.height }, imageWidth, imageHeight);
  const buckets = new Map<string, { count: number; r: number; g: number; b: number }>();
  const coarseBuckets = new Map<string, number>();
  if (interior) {
    for (let y = interior.top; y < interior.top + interior.height; y += 1) {
      for (let x = interior.left; x < interior.left + interior.width; x += 1) {
      const index = (y * imageWidth + x) * image.channels;
      if (image.data[index + 3] < 24) continue;
      const key = `${Math.floor(image.data[index] / 16)}:${Math.floor(image.data[index + 1] / 16)}:${Math.floor(image.data[index + 2] / 16)}`;
      const bucket = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
      bucket.count += 1; bucket.r += image.data[index]; bucket.g += image.data[index + 1]; bucket.b += image.data[index + 2];
      buckets.set(key, bucket);
      const coarseKey = `${Math.floor(image.data[index] / 32)}:${Math.floor(image.data[index + 1] / 32)}:${Math.floor(image.data[index + 2] / 32)}`;
      coarseBuckets.set(coarseKey, (coarseBuckets.get(coarseKey) ?? 0) + 1);
      }
    }
  }
  const dominant = [...buckets.values()].sort((left, right) => right.count - left.count)[0];
  const interiorCount = [...buckets.values()].reduce((total, bucket) => total + bucket.count, 0);
  const coarseDominantCount = Math.max(0, ...coarseBuckets.values());
  const dominantColor = dominant ? { r: Math.round(dominant.r / dominant.count), g: Math.round(dominant.g / dominant.count), b: Math.round(dominant.b / dominant.count) } : null;

  return {
    meanAlpha,
    medianColor: dominantColor ?? { r: Math.round(median(reds)), g: Math.round(median(greens)), b: Math.round(median(blues)) },
    colorStdDev,
    sampledPixelCount: alphas.length,
    dominantColorRatio: dominant && interiorCount > 0 ? dominant.count / interiorCount : 0,
    coarseDominantColorRatio: interiorCount > 0 ? coarseDominantCount / interiorCount : 0,
  };
}

export interface TextColor {
  r: number;
  g: number;
  b: number;
}

/**
 * OCR 영역 내부에서 배경색과 충분히 다른 픽셀(=글자 획)을 모아 대표 글자색을 추정한다.
 * 번역 텍스트를 원본과 같은 색으로 렌더링하는 데 쓴다. 글자 픽셀이 너무 적으면 null.
 */
export async function sampleTextColor(
  buffer: Buffer,
  box: PixelBox,
  _imageWidth: number,
  _imageHeight: number,
  background: { r: number; g: number; b: number },
): Promise<TextColor | null> {
  return sampleTextColorFromDecoded(await decodeImagePixels(buffer), box, background);
}

export function sampleTextColorFromDecoded(
  image: DecodedImage,
  box: PixelBox,
  background: { r: number; g: number; b: number },
  textMask?: FeatherMask,
): TextColor | null {
  const imageWidth = image.width;
  const imageHeight = image.height;
  const interior = clampRect({ left: box.x, top: box.y, width: box.width, height: box.height }, imageWidth, imageHeight);
  if (!interior) return null;

  // 배경색에서 먼 픽셀만 글자 후보로 삼고, 16단계 양자화 버킷의 dominant를 글자색으로 본다.
  // 안티에일리어싱 경계의 중간색이 평균을 흐리지 않도록 median 대신 dominant 방식을 쓴다.
  // 마스크가 있으면 실제 글자 획의 중심 픽셀만 사용하므로, 배경과 색 차이가 작은 컬러
  // 글자도 추출한다. 마스크가 없는 이전 호출은 보수적인 기존 임계값을 유지한다.
  const minColorDistance = textMask ? 24 : 60;
  const minColorDistanceSquared = minColorDistance ** 2;
  const buckets = new Map<string, { count: number; r: number; g: number; b: number; distance: number }>();
  for (let y = interior.top; y < interior.top + interior.height; y += 1) {
    for (let x = interior.left; x < interior.left + interior.width; x += 1) {
    const index = (y * imageWidth + x) * image.channels;
    if (image.data[index + 3] < 24) continue;
    if (textMask && textMask.data[y * imageWidth + x] >= 96) continue;
    const dr = image.data[index] - background.r;
    const dg = image.data[index + 1] - background.g;
    const db = image.data[index + 2] - background.b;
    // 픽셀마다 sqrt를 계산할 필요 없이 제곱 거리끼리 비교한다.
    if (dr * dr + dg * dg + db * db < minColorDistanceSquared) continue;
    const key = `${image.data[index] >> 4}:${image.data[index + 1] >> 4}:${image.data[index + 2] >> 4}`;
    const bucket = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0, distance: 0 };
    bucket.count += 1;
    bucket.r += image.data[index];
    bucket.g += image.data[index + 1];
    bucket.b += image.data[index + 2];
    bucket.distance += Math.sqrt(dr * dr + dg * dg + db * db);
    buckets.set(key, bucket);
    }
  }

  const minimumSamples = textMask ? Math.max(4, Math.ceil(interior.width * interior.height * 0.002)) : 12;
  // JPEG 안티에일리어싱으로 생긴 배경 근처 회색은 개수가 많아도 글자색이 아니다. 픽셀
  // 개수 × 평균 배경 거리의 제곱근으로 평가하면 글자 핵심색을 우선하면서, 얇은 검은
  // 외곽선보다 넓은 컬러 본문이 충분히 많을 때는 본문색을 유지할 수 있다.
  const dominant = [...buckets.values()]
    .filter((bucket) => bucket.count >= minimumSamples)
    .sort((left, right) => (
      right.count * Math.sqrt(right.distance / right.count)
      - left.count * Math.sqrt(left.distance / left.count)
    ))[0];
  if (!dominant || dominant.count < minimumSamples) return null;
  return {
    r: Math.round(dominant.r / dominant.count),
    g: Math.round(dominant.g / dominant.count),
    b: Math.round(dominant.b / dominant.count),
  };
}
