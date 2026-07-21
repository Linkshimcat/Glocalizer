import type { BorderStats } from './background-sampler.js';
import type { CleanupMethod, CleanupQuality } from '../types/cleanup.js';

const TRANSPARENT_ALPHA_MEAN_THRESHOLD = 25;
const TRANSPARENT_ALPHA_GOOD_THRESHOLD = 8;

const SOLID_STDDEV_GOOD = 14;
const SOLID_STDDEV_ACCEPTABLE = 30;

/** 테두리 통계만 보고 자동 복원이 가능한 방식을 고른다. 배경이 복잡하면 manual-required로 보낸다. */
export function decideCleanupMethod(stats: BorderStats): CleanupMethod {
  if (stats.meanAlpha < TRANSPARENT_ALPHA_MEAN_THRESHOLD) return 'transparent-mask';
  if (stats.colorStdDev <= SOLID_STDDEV_ACCEPTABLE) return 'solid-color-fill';
  return 'manual-required';
}

export function assessCleanupQuality(method: CleanupMethod, stats: BorderStats): CleanupQuality {
  if (method === 'manual-required') return 'low';

  if (method === 'transparent-mask') {
    return stats.meanAlpha <= TRANSPARENT_ALPHA_GOOD_THRESHOLD ? 'good' : 'acceptable';
  }

  // solid-color-fill
  if (stats.colorStdDev <= SOLID_STDDEV_GOOD) return 'good';
  if (stats.colorStdDev <= SOLID_STDDEV_ACCEPTABLE) return 'acceptable';
  return 'low';
}
