import { describe, expect, it } from 'vitest';
import { isMaskCoverageSafe, measureMaskCoverage } from '../../src/image/mask-coverage.js';

function maskWithErasedPixels(erasedPixelCount: number) {
  const data = new Uint8Array(100).fill(255);
  for (let index = 0; index < erasedPixelCount; index += 1) data[index] = 0;
  return { data, width: 10, height: 10, roi: { x: 0, y: 0, width: 10, height: 10 } };
}

describe('mask coverage safety', () => {
  it('accepts a text-sized erase mask', () => {
    const coverage = measureMaskCoverage(maskWithErasedPixels(18));
    expect(coverage.eraseRatio).toBe(0.18);
    expect(isMaskCoverageSafe(coverage)).toBe(true);
  });

  it('rejects an empty or near-full erase mask', () => {
    expect(isMaskCoverageSafe(measureMaskCoverage(maskWithErasedPixels(0)))).toBe(false);
    expect(isMaskCoverageSafe(measureMaskCoverage(maskWithErasedPixels(80)))).toBe(false);
  });

  it('allows a higher erase ratio when the background is uniform (solid/transparent fill)', () => {
    // 단색/투명 배경에서는 안티에일리어싱까지 지우는 정상적인 마스크가 70~90%대 erase ratio를
    // 내는 것을 실측으로 확인했다(2026-09-17). 복잡한 배경 기준(0.62)으로는 이런 정상 케이스가
    // 전부 manual-required로 떨어졌었다.
    const coverage = measureMaskCoverage(maskWithErasedPixels(80));
    expect(isMaskCoverageSafe(coverage, true)).toBe(true);
    expect(isMaskCoverageSafe(coverage, false)).toBe(false);
  });

  it('still rejects a near-total erase mask even on a uniform background', () => {
    expect(isMaskCoverageSafe(measureMaskCoverage(maskWithErasedPixels(97)), true)).toBe(false);
  });
});
