import { boxArea, boxCenter } from '../../utils/bbox.js';
import type { OcrRegion } from '../../types/ocr.js';

const WEIGHTS = {
  containsKorean: 40,
  confidence: 30,
  area: 15,
  centerProximity: 10,
  bottomPlacement: 5,
};

function scoreRegion(region: OcrRegion, imageWidth: number, imageHeight: number): number {
  const imageArea = Math.max(imageWidth * imageHeight, 1);
  const areaRatio = Math.min(boxArea(region.box) / imageArea, 1);

  const center = boxCenter(region.box);
  const imageCenter = { x: imageWidth / 2, y: imageHeight / 2 };
  const maxDistance = Math.hypot(imageWidth, imageHeight) / 2 || 1;
  const distance = Math.hypot(center.x - imageCenter.x, center.y - imageCenter.y);
  const centerProximity = Math.max(0, 1 - distance / maxDistance);

  const isBottomHalf = center.y >= imageHeight / 2;

  return (
    (region.containsKorean ? WEIGHTS.containsKorean : 0) +
    region.confidence * WEIGHTS.confidence +
    areaRatio * WEIGHTS.area +
    centerProximity * WEIGHTS.centerProximity +
    (isBottomHalf ? WEIGHTS.bottomPlacement : 0)
  );
}

const MIN_CONFIDENCE_FOR_PRIMARY = 0.4;

/**
 * 프런트 에디터가 우선 표시할 대표 텍스트 영역 하나를 고른다.
 * 점수식: 한글포함 40 + confidence*30 + 면적비율*15 + 중심근접도*10 + 하단배치 5
 * confidence가 MIN_CONFIDENCE_FOR_PRIMARY 미만이면 primary를 지정하지 않는다.
 */
export function selectPrimaryRegion(regions: OcrRegion[], imageWidth: number, imageHeight: number): OcrRegion[] {
  if (regions.length === 0) return regions;

  let bestIndex = -1;
  let bestScore = -Infinity;

  regions.forEach((region, index) => {
    if (region.confidence < MIN_CONFIDENCE_FOR_PRIMARY) return;
    const score = scoreRegion(region, imageWidth, imageHeight);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return regions.map((region, index) => ({ ...region, isPrimary: index === bestIndex }));
}
