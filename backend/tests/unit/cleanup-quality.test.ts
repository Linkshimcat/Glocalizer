import { describe, expect, it } from 'vitest';
import { assessCleanupQuality, decideCleanupMethod } from '../../src/image/cleanup-quality.js';
import type { BorderStats } from '../../src/image/background-sampler.js';

function stats(overrides: Partial<BorderStats>): BorderStats {
  return { meanAlpha: 255, medianColor: { r: 255, g: 255, b: 255 }, colorStdDev: 0, sampledPixelCount: 100, dominantColorRatio: 0, ...overrides };
}

describe('decideCleanupMethod', () => {
  it('테두리가 거의 투명하면 transparent-mask', () => {
    expect(decideCleanupMethod(stats({ meanAlpha: 2 }))).toBe('transparent-mask');
  });

  it('불투명하고 색이 균일하면 solid-color-fill', () => {
    expect(decideCleanupMethod(stats({ meanAlpha: 255, colorStdDev: 5 }))).toBe('solid-color-fill');
  });

  it('불투명하고 색 편차가 크면 manual-required', () => {
    expect(decideCleanupMethod(stats({ meanAlpha: 255, colorStdDev: 80 }))).toBe('manual-required');
  });

  it('말풍선처럼 내부 지배 색상이 뚜렷하면 테두리 편차가 있어도 단색 채우기를 쓴다', () => {
    expect(decideCleanupMethod(stats({ colorStdDev: 80, dominantColorRatio: 0.7 }))).toBe('solid-color-fill');
  });
});

describe('assessCleanupQuality', () => {
  it('manual-required는 항상 low', () => {
    expect(assessCleanupQuality('manual-required', stats({}))).toBe('low');
  });

  it('transparent-mask는 alpha가 아주 낮을 때 good, 아니면 acceptable', () => {
    expect(assessCleanupQuality('transparent-mask', stats({ meanAlpha: 1 }))).toBe('good');
    expect(assessCleanupQuality('transparent-mask', stats({ meanAlpha: 20 }))).toBe('acceptable');
  });

  it('solid-color-fill은 색 편차 구간에 따라 good/acceptable/low로 나뉜다', () => {
    expect(assessCleanupQuality('solid-color-fill', stats({ colorStdDev: 5 }))).toBe('good');
    expect(assessCleanupQuality('solid-color-fill', stats({ colorStdDev: 20 }))).toBe('acceptable');
    expect(assessCleanupQuality('solid-color-fill', stats({ colorStdDev: 50 }))).toBe('low');
  });
});
