import type { BorderStats } from './background-sampler.js';
import type { CleanupMethod, CleanupQuality } from '../types/cleanup.js';

const TRANSPARENT_ALPHA_MEAN_THRESHOLD = 25;
const TRANSPARENT_ALPHA_GOOD_THRESHOLD = 8;
const TRANSPARENT_RING_WITH_TRANSPARENT_EDGE = 0.35;

const SOLID_STDDEV_GOOD = 14;
const SOLID_STDDEV_ACCEPTABLE = 30;
const DOMINANT_COLOR_SOLID_THRESHOLD = 0.58;
const COARSE_DOMINANT_COLOR_SOLID_THRESHOLD = 0.72;
const COARSE_DOMINANT_COLOR_MAX_STDDEV = 55;

/** 테두리 통계만 보고 자동 복원이 가능한 방식을 고른다. 배경이 복잡하면 manual-required로 보낸다. */
export function decideCleanupMethod(stats: BorderStats): CleanupMethod {
  if (stats.meanAlpha < TRANSPARENT_ALPHA_MEAN_THRESHOLD) return 'transparent-mask';
  // 링 전체 통계가 캐릭터·윤곽선 몇 픽셀에 무너져도, 깨끗한 변들이 배경을 증언하면 그대로 쓴다.
  if (stats.sidesBackground?.kind === 'transparent') return 'transparent-mask';
  if (stats.sidesBackground?.kind === 'solid') return 'solid-color-fill';
  // 가장자리가 투명한 스티커 PNG에서 링 일부가 글자 획·캐릭터에 가려 깨끗한 변이 모자라도, 링에 투명 픽셀이
  // 상당수 있으면 배경은 투명이다. (링의 불투명 픽셀만 보고 "단색/복잡"으로 오판하지 않는다.)
  if (stats.imageEdgeTransparent && stats.ringTransparentRatio >= TRANSPARENT_RING_WITH_TRANSPARENT_EDGE) return 'transparent-mask';
  if (
    stats.colorStdDev <= SOLID_STDDEV_ACCEPTABLE
    || stats.dominantColorRatio >= DOMINANT_COLOR_SOLID_THRESHOLD
    || (stats.coarseDominantColorRatio >= COARSE_DOMINANT_COLOR_SOLID_THRESHOLD && stats.colorStdDev <= COARSE_DOMINANT_COLOR_MAX_STDDEV)
  ) return 'solid-color-fill';
  // 배경이 복잡해도 곧장 포기(manual-required)하지 않고 cv2 인페인팅을 시도한다.
  // "글자가 그대로 남는 것"이 "살짝 뭉개지는 것"보다 나쁜 실패라는 팀 합의에 따라 자동
  // 복원 범위를 넓힌다. 마스크가 비정상이면 cleanup.service의 coverage 안전장치가 fallback.
  return 'directional-inpaint';
}

export function assessCleanupQuality(method: CleanupMethod, stats: BorderStats): CleanupQuality {
  if (method === 'manual-required') return 'low';

  if (method === 'transparent-mask') {
    if (stats.sidesBackground?.kind === 'transparent') return 'good';
    return stats.meanAlpha <= TRANSPARENT_ALPHA_GOOD_THRESHOLD ? 'good' : 'acceptable';
  }

  if (method === 'directional-inpaint') return 'acceptable';

  // solid-color-fill
  if (stats.sidesBackground?.kind === 'solid') return 'good';
  if (stats.colorStdDev <= SOLID_STDDEV_GOOD) return 'good';
  if (stats.colorStdDev <= SOLID_STDDEV_ACCEPTABLE) return 'acceptable';
  // 지배색이 확실하면(예: 검은 배경) stddev가 높아도 이는 '고대비 글자' 때문이지
  // '복잡한 배경'이 아니다. 이런 solid 배경은 채우기가 오히려 쉬우므로 자동 처리한다.
  if (stats.coarseDominantColorRatio >= COARSE_DOMINANT_COLOR_SOLID_THRESHOLD) return 'acceptable';
  return 'low';
}
