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
});
