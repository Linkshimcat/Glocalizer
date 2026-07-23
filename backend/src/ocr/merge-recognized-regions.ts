import type { RecognizedRegion } from './ocr-provider.types.js';

interface RegionBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

function boundsOf(region: RecognizedRegion): RegionBounds {
  const xs = region.polygon.map((point) => point.x);
  const ys = region.polygon.map((point) => point.y);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  const right = Math.max(...xs);
  const bottom = Math.max(...ys);
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

function isKoreanFragment(text: string): boolean {
  return /[\uAC00-\uD7A3]/.test(text) || /^[?!,.~…]+$/.test(text.trim());
}

function belongsToSameLine(previous: RecognizedRegion, next: RecognizedRegion): boolean {
  if (!isKoreanFragment(previous.text) || !isKoreanFragment(next.text)) return false;
  const left = boundsOf(previous);
  const right = boundsOf(next);
  const verticalOverlap = Math.max(0, Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top));
  const minimumHeight = Math.max(1, Math.min(left.height, right.height));
  const gap = right.left - left.right;
  const maximumGap = Math.max(12, Math.max(left.height, right.height) * 0.8);
  return verticalOverlap / minimumHeight >= 0.55 && gap >= -2 && gap <= maximumGap;
}

function mergeGroup(group: RecognizedRegion[]): RecognizedRegion {
  if (group.length === 1) return group[0];
  const allPoints = group.flatMap((region) => region.polygon);
  const left = Math.min(...allPoints.map((point) => point.x));
  const top = Math.min(...allPoints.map((point) => point.y));
  const right = Math.max(...allPoints.map((point) => point.x));
  const bottom = Math.max(...allPoints.map((point) => point.y));
  return {
    text: group.map((region) => region.text.trim()).join(''),
    confidence: Math.min(...group.map((region) => region.confidence)),
    polygon: [{ x: left, y: top }, { x: right, y: top }, { x: right, y: bottom }, { x: left, y: bottom }],
  };
}

/** 같은 줄에서 분절된 한글 OCR box를 하나의 문구로 결합한다. */
export function mergeAdjacentKoreanRegions(regions: RecognizedRegion[]): RecognizedRegion[] {
  const sorted = [...regions]
    .filter((region) => region.text.trim() && region.polygon.length >= 4)
    .sort((left, right) => boundsOf(left).top - boundsOf(right).top || boundsOf(left).left - boundsOf(right).left);
  const merged: RecognizedRegion[] = [];
  let group: RecognizedRegion[] = [];

  for (const region of sorted) {
    if (group.length === 0 || belongsToSameLine(group[group.length - 1], region)) {
      group.push(region);
      continue;
    }
    merged.push(mergeGroup(group));
    group = [region];
  }
  if (group.length > 0) merged.push(mergeGroup(group));
  return merged;
}
