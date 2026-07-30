import type { FeatherMask } from './mask-generator.js';

const ERASE_MASK_THRESHOLD = 180;
const MIN_ERASE_RATIO = 0.005;
const MAX_ERASE_RATIO = 0.62;

export interface MaskCoverage {
  eraseRatio: number;
  erasedPixelCount: number;
  sampledPixelCount: number;
}

/**
 * OCR box 내부에서 실제로 지우려는 면적을 측정한다. 너무 작으면 잔상이 남고,
 * 너무 크면 말풍선·캐릭터까지 지울 가능성이 높으므로 자동 처리하지 않는다.
 */
export function measureMaskCoverage(mask: FeatherMask): MaskCoverage {
  const left = Math.max(0, Math.floor(mask.roi.x));
  const top = Math.max(0, Math.floor(mask.roi.y));
  const right = Math.min(mask.width, Math.ceil(mask.roi.x + mask.roi.width));
  const bottom = Math.min(mask.height, Math.ceil(mask.roi.y + mask.roi.height));
  let erasedPixelCount = 0;
  let sampledPixelCount = 0;
  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) {
      sampledPixelCount += 1;
      if (mask.data[y * mask.width + x] < ERASE_MASK_THRESHOLD) erasedPixelCount += 1;
    }
  }
  return { eraseRatio: sampledPixelCount === 0 ? 0 : erasedPixelCount / sampledPixelCount, erasedPixelCount, sampledPixelCount };
}

export function isMaskCoverageSafe(coverage: MaskCoverage): boolean {
  return coverage.eraseRatio >= MIN_ERASE_RATIO && coverage.eraseRatio <= MAX_ERASE_RATIO;
}
