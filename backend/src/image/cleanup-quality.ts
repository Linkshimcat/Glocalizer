import type { BorderStats } from './background-sampler.js';
import type { CleanupMethod, CleanupQuality } from '../types/cleanup.js';

const TRANSPARENT_ALPHA_MEAN_THRESHOLD = 25;
const TRANSPARENT_ALPHA_GOOD_THRESHOLD = 8;

const SOLID_STDDEV_GOOD = 14;
const SOLID_STDDEV_ACCEPTABLE = 30;

/**
 * 테두리 통계로 정리 방식을 고른다. 테두리가 투명하면 투명 마스크, 그 외에는 항상 단색 덮기로 처리한다.
 * (배경이 복잡해도 포기하지 않고 텍스트 바로 옆 색으로 강제로 덮는다 — 그라데이션/무늬 배경에선 티가 날 수 있으나
 *  대부분의 말풍선·단색 배경 이모티콘에서는 한글이 실제로 사라진다. 품질은 assessCleanupQuality가 'low'로 표시.)
 */
export function decideCleanupMethod(stats: BorderStats): CleanupMethod {
  if (stats.meanAlpha < TRANSPARENT_ALPHA_MEAN_THRESHOLD) return 'transparent-mask';
  return 'solid-color-fill';
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
