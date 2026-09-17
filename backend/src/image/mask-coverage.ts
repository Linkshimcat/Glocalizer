import type { FeatherMask } from './mask-generator.js';

const ERASE_MASK_THRESHOLD = 180;
const MIN_ERASE_RATIO = 0.005;
// 복잡한 배경(directional-inpaint)에서는 지우는 비율이 크면 캐릭터·말풍선까지 먹힐 위험이
// 실제로 있어 보수적으로 막는다.
const MAX_ERASE_RATIO_COMPLEX = 0.62;
// 단색/투명 배경(solid-color-fill, transparent-mask)은 decideCleanupMethod가 이미 테두리
// 통계로 "지울 것 외엔 아무것도 없는 배경"임을 확인한 뒤에만 선택하는 방식이라, 지우는
// 비율이 높아도 안전하다. 실측 결과 짧은 한글 캡션도 안티에일리어싱까지 지우려면 마스크
// dilate/blur 때문에 71~87% 정도가 정상 범위였는데, 기존 0.62 상한이 이런 평범한 케이스를
// 전부 위험으로 오판해 manual-required로 떨어뜨리고 있었다(2026-09-17 실측).
const MAX_ERASE_RATIO_UNIFORM = 0.92;

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

export function isMaskCoverageSafe(coverage: MaskCoverage, backgroundIsUniform = false): boolean {
  const maxRatio = backgroundIsUniform ? MAX_ERASE_RATIO_UNIFORM : MAX_ERASE_RATIO_COMPLEX;
  return coverage.eraseRatio >= MIN_ERASE_RATIO && coverage.eraseRatio <= maxRatio;
}
