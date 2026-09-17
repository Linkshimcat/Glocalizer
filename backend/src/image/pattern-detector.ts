import type { PixelBox } from '../utils/bbox.js';
import type { DecodedImage } from './background-sampler.js';

const PERIODICITY_THRESHOLD = 0.5;
const MIN_REBOUND = 0.2;
const MIN_PATCH_SIZE = 24;

interface Patch { left: number; top: number; width: number; height: number; }

function clampPatch(patch: Patch, imageWidth: number, imageHeight: number): Patch | null {
  const left = Math.max(0, Math.round(patch.left));
  const top = Math.max(0, Math.round(patch.top));
  const right = Math.min(imageWidth, Math.round(patch.left + patch.width));
  const bottom = Math.min(imageHeight, Math.round(patch.top + patch.height));
  const width = right - left;
  const height = bottom - top;
  if (width < MIN_PATCH_SIZE || height < MIN_PATCH_SIZE) return null;
  return { left, top, width, height };
}

/**
 * OCR box 바로 아래(공간이 없으면 위) 순수 배경 영역을 표본으로 삼는다. 물방울무늬·체크무늬
 * 처럼 반복되는 배경은 보통 이미지 전체에 균일하게 깔려 있다는 전제다.
 */
function selectBackgroundPatch(box: PixelBox, imageWidth: number, imageHeight: number): Patch | null {
  const height = Math.max(MIN_PATCH_SIZE, Math.round(box.height * 3));
  const below: Patch = { left: box.x, top: box.y + box.height, width: box.width, height };
  const clampedBelow = clampPatch(below, imageWidth, imageHeight);
  if (clampedBelow) return clampedBelow;
  const above: Patch = { left: box.x, top: box.y - height, width: box.width, height };
  return clampPatch(above, imageWidth, imageHeight);
}

function buildLuminanceProfiles(image: DecodedImage, patch: Patch): { rowProfile: number[]; columnProfile: number[] } {
  const rowSums = new Array(patch.height).fill(0);
  const columnSums = new Array(patch.width).fill(0);
  for (let y = 0; y < patch.height; y += 1) {
    for (let x = 0; x < patch.width; x += 1) {
      const base = ((patch.top + y) * image.width + (patch.left + x)) * image.channels;
      const luminance = image.data[base] * 0.299 + image.data[base + 1] * 0.587 + image.data[base + 2] * 0.114;
      rowSums[y] += luminance;
      columnSums[x] += luminance;
    }
  }
  return {
    rowProfile: rowSums.map((sum) => sum / patch.width),
    columnProfile: columnSums.map((sum) => sum / patch.height),
  };
}

/** 신호 자신과의 정규화 자기상관을 모든 lag(0..n-1)에 대해 구한다. lag=0은 항상 1이다. */
function autocorrelation(signal: number[]): number[] {
  const n = signal.length;
  const mean = signal.reduce((sum, value) => sum + value, 0) / n;
  const centered = signal.map((value) => value - mean);
  const variance = centered.reduce((sum, value) => sum + value * value, 0) / n;
  if (variance < 1e-6) return new Array(n).fill(0);
  const result: number[] = [];
  for (let lag = 0; lag < n; lag += 1) {
    let sum = 0;
    for (let index = 0; index < n - lag; index += 1) sum += centered[index] * centered[index + lag];
    result.push(sum / ((n - lag) * variance));
  }
  return result;
}

/**
 * 그라디언트처럼 매끈하게 한쪽으로만 변하는 배경도 자기상관이 lag 내내 높게 유지될 수 있어,
 * "값이 크다"만으로는 반복 패턴과 구분되지 않는다(실측으로 확인한 오탐). 진짜 반복 패턴은
 * 한 번 떨어졌다가(트로프) 다시 튀어 오르는(리바운드) 모양이 나온다 — 그라디언트는 최솟값이
 * 탐색 구간 끝에서 나오고 그 뒤로 다시 오르지 않는다. 트로프 이후 구간에서 리바운드가
 * 실제로 있는지까지 확인한다.
 */
function hasPeriodicPeak(profile: number[]): boolean {
  const n = profile.length;
  const minLag = Math.max(3, Math.floor(n * 0.08));
  const maxLag = Math.floor(n / 2);
  if (maxLag <= minLag + 1) return false;
  const acf = autocorrelation(profile);
  let troughLag = minLag;
  let troughValue = acf[minLag];
  for (let lag = minLag + 1; lag <= maxLag; lag += 1) {
    if (acf[lag] < troughValue) { troughValue = acf[lag]; troughLag = lag; }
  }
  if (troughLag >= maxLag) return false;
  let peakAfterTrough = -Infinity;
  for (let lag = troughLag + 1; lag <= maxLag; lag += 1) peakAfterTrough = Math.max(peakAfterTrough, acf[lag]);
  return peakAfterTrough >= PERIODICITY_THRESHOLD && peakAfterTrough - troughValue >= MIN_REBOUND;
}

/**
 * 배경이 물방울무늬·체크무늬처럼 반복되는 패턴인지 감지한다. cv2 Telea 인페인팅은 이런
 * 반복 구조를 재현하지 못하고 얼룩을 남긴다는 걸 실측으로 확인했다(2026-09-17) — 색 분산은
 * 오히려 스머지 영역이 정상 패턴보다 높게 나와 분산 기준으로는 구분이 안 됐다. 대신 배경의
 * 가로/세로 밝기 프로파일에서 자기상관 재부상(재현되는 주기)을 찾아 사전에 걸러낸다.
 */
export function detectsPeriodicPattern(image: DecodedImage, box: PixelBox): boolean {
  const patch = selectBackgroundPatch(box, image.width, image.height);
  if (!patch) return false;
  const { rowProfile, columnProfile } = buildLuminanceProfiles(image, patch);
  return hasPeriodicPeak(rowProfile) || hasPeriodicPeak(columnProfile);
}
