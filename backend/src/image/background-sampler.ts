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
  /**
   * 테두리 네 변을 따로 봤을 때 "깨끗한 배경"이 2변 이상 서로 일치하는지의 판정. 링 전체 평균·표준편차는
   * 글자 옆에 붙은 캐릭터 몸통·윤곽선 몇 픽셀만 섞여도 무너져서, 같은 이미지가 OCR 박스가 조금만 달라도
   * "복잡한 배경"으로 뒤집히던 문제(2026-09-21 실측)를 막는다. 없으면 null.
   */
  sidesBackground: { kind: 'transparent' } | { kind: 'solid'; color: { r: number; g: number; b: number }; cleanSides: number; totalSides: number } | null;
  /** 링 픽셀 중 투명(알파 < 24)한 비율. */
  ringTransparentRatio: number;
  /** 이미지 바깥 가장자리가 거의 투명한가 — 배경이 투명한 스티커 PNG인지 보는 전역 단서. */
  imageEdgeTransparent: boolean;
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

const SIDE_MIN_PIXELS = 16;
const SIDE_CLEAN_RATIO = 0.85;
const SIDE_COLOR_TOLERANCE = 40;
const SIDES_AGREE_TOLERANCE = 48;
const SIDE_TRANSPARENT_ALPHA = 24;

interface SideSummary {
  pixelCount: number;
  transparentRatio: number;
  dominantRatio: number;
  dominantColor: { r: number; g: number; b: number } | null;
}

/** 한 변의 픽셀을 훑어 투명 비율과, 불투명 픽셀의 지배색·그 색에 가까운 비율을 구한다. */
function summarizeSide(image: DecodedImage, strip: Rect): SideSummary {
  const opaque: Array<[number, number, number]> = [];
  const buckets = new Map<string, { count: number; r: number; g: number; b: number }>();
  let pixelCount = 0;
  let transparentCount = 0;
  for (let y = strip.top; y < strip.top + strip.height; y += 1) {
    for (let x = strip.left; x < strip.left + strip.width; x += 1) {
      const base = (y * image.width + x) * image.channels;
      pixelCount += 1;
      if (image.data[base + 3] < SIDE_TRANSPARENT_ALPHA) { transparentCount += 1; continue; }
      const r = image.data[base]; const g = image.data[base + 1]; const b = image.data[base + 2];
      opaque.push([r, g, b]);
      const key = `${r >> 4}:${g >> 4}:${b >> 4}`;
      const bucket = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
      bucket.count += 1; bucket.r += r; bucket.g += g; bucket.b += b;
      buckets.set(key, bucket);
    }
  }
  const top = [...buckets.values()].sort((left, right) => right.count - left.count)[0];
  const dominantColor = top ? { r: Math.round(top.r / top.count), g: Math.round(top.g / top.count), b: Math.round(top.b / top.count) } : null;
  let near = 0;
  if (dominantColor) {
    for (const [r, g, b] of opaque) {
      if (Math.hypot(r - dominantColor.r, g - dominantColor.g, b - dominantColor.b) <= SIDE_COLOR_TOLERANCE) near += 1;
    }
  }
  return {
    pixelCount,
    transparentRatio: pixelCount === 0 ? 0 : transparentCount / pixelCount,
    dominantRatio: opaque.length === 0 ? 0 : near / opaque.length,
    dominantColor,
  };
}

/**
 * 네 변 중 깨끗한 배경(투명 또는 단색)인 변이 2개 이상(변이 이미지 밖으로 잘려 그보다 적으면 있는 변
 * 전부)이고 그 변들이 서로 같은 배경이면 그 배경을 돌려준다. 한 변에만 캐릭터가 붙어 있어도 나머지
 * 깨끗한 변들이 배경을 증언한다.
 */
function detectSidesBackground(image: DecodedImage, strips: Rect[]): BorderStats['sidesBackground'] {
  const sides = strips.map((strip) => summarizeSide(image, strip)).filter((side) => side.pixelCount >= SIDE_MIN_PIXELS);
  if (sides.length === 0) return null;
  const required = Math.min(2, sides.length);
  const transparentSides = sides.filter((side) => side.transparentRatio >= SIDE_CLEAN_RATIO);
  if (transparentSides.length >= required) return { kind: 'transparent' };
  const solidSides = sides.filter((side) => side.transparentRatio < 0.1 && side.dominantRatio >= SIDE_CLEAN_RATIO && side.dominantColor !== null);
  if (solidSides.length < required) return null;
  // 깨끗한 변이라도 캐릭터 몸통처럼 배경이 아닌 균일한 면일 수 있다. 서로 색이 일치하는 변이 가장 많은
  // 묶음을 배경으로 보고, 두 묶음이 같은 수로 맞서면 어느 쪽이 배경인지 알 수 없으니 판정을 보류한다.
  const clusters = solidSides.map((anchorSide) => solidSides.filter((side) => Math.hypot(
    side.dominantColor!.r - anchorSide.dominantColor!.r,
    side.dominantColor!.g - anchorSide.dominantColor!.g,
    side.dominantColor!.b - anchorSide.dominantColor!.b,
  ) <= SIDES_AGREE_TOLERANCE));
  const best = clusters.reduce((winner, cluster) => (cluster.length > winner.length ? cluster : winner), clusters[0]);
  if (best.length < required) return null;
  const rival = clusters.find((cluster) => cluster.length === best.length && !cluster.some((side) => best.includes(side)));
  if (rival) return null;
  const agreeing = best;
  const color = {
    r: Math.round(agreeing.reduce((sum, side) => sum + side.dominantColor!.r, 0) / agreeing.length),
    g: Math.round(agreeing.reduce((sum, side) => sum + side.dominantColor!.g, 0) / agreeing.length),
    b: Math.round(agreeing.reduce((sum, side) => sum + side.dominantColor!.b, 0) / agreeing.length),
  };
  return { kind: 'solid', color, cleanSides: agreeing.length, totalSides: sides.length };
}

const EDGE_TRANSPARENT_RATIO = 0.9;

/** 이미지 바깥 2px 테두리가 거의 투명하면 배경이 투명한 스티커로 본다. */
function isImageEdgeTransparent(image: DecodedImage): boolean {
  let total = 0;
  let transparent = 0;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      if (x >= 2 && x < image.width - 2 && y >= 2 && y < image.height - 2) { x = image.width - 3; continue; }
      total += 1;
      if (image.data[(y * image.width + x) * image.channels + 3] < SIDE_TRANSPARENT_ALPHA) transparent += 1;
    }
  }
  return total > 0 && transparent / total >= EDGE_TRANSPARENT_RATIO;
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
      sidesBackground: detectSidesBackground(image, strips),
      ringTransparentRatio: alphas.length === 0 ? 0 : alphas.filter((a) => a < SIDE_TRANSPARENT_ALPHA).length / alphas.length,
      imageEdgeTransparent: isImageEdgeTransparent(image),
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

  const sidesBackground = detectSidesBackground(image, strips);
  return {
    meanAlpha,
    // 박스 안쪽 최빈색은 글자가 두꺼워 배경보다 많으면 글자색이 된다. 깨끗한 변들이 단색 배경이라고 합의했다면
    // 그 색이 더 믿을 만하다.
    medianColor: sidesBackground?.kind === 'solid'
      ? sidesBackground.color
      : dominantColor ?? { r: Math.round(median(reds)), g: Math.round(median(greens)), b: Math.round(median(blues)) },
    colorStdDev,
    sampledPixelCount: alphas.length,
    dominantColorRatio: dominant && interiorCount > 0 ? dominant.count / interiorCount : 0,
    coarseDominantColorRatio: interiorCount > 0 ? coarseDominantCount / interiorCount : 0,
    sidesBackground,
    ringTransparentRatio: alphas.filter((a) => a < SIDE_TRANSPARENT_ALPHA).length / alphas.length,
    imageEdgeTransparent: isImageEdgeTransparent(image),
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
