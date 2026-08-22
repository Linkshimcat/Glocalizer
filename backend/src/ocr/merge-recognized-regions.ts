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
  // 같은 줄 한글은 OCR 박스가 서로 살짝 겹칠 수 있다("왕"|"피"처럼 붙은 글자). 겹침(음수
  // gap)을 작은 글자 폭의 절반까지 허용해, 인접 조각이 갈라져 하나만 마스킹되는 것을 막는다.
  const minimumGap = -Math.min(left.width, right.width) * 0.5;
  return verticalOverlap / minimumHeight >= 0.55 && gap >= minimumGap && gap <= maximumGap;
}

function mergeGroup(group: RecognizedRegion[], separator: string): RecognizedRegion {
  if (group.length === 1) return group[0];
  const allPoints = group.flatMap((region) => region.polygon);
  const left = Math.min(...allPoints.map((point) => point.x));
  const top = Math.min(...allPoints.map((point) => point.y));
  const right = Math.max(...allPoints.map((point) => point.x));
  const bottom = Math.max(...allPoints.map((point) => point.y));
  return {
    text: group.map((region) => region.text.trim()).join(separator),
    confidence: Math.min(...group.map((region) => region.confidence)),
    polygon: [{ x: left, y: top }, { x: right, y: top }, { x: right, y: bottom }, { x: left, y: bottom }],
  };
}

/**
 * 긴 캡션이 줄바꿈으로 두 줄 이상 나뉜 경우, 바로 아래 줄로 자연스럽게 이어지는지 판별한다.
 * 세로 간격이 줄간격 정도로 가깝고 좌우로 충분히 겹쳐야만 "같은 캡션의 다음 줄"로 본다 —
 * 서로 다른 캡션/말풍선을 잘못 합치는 것이, 지금처럼 둘째 줄이 무시되는 것보다 훨씬 나쁜
 * 실패 모드라 기준을 보수적으로 잡는다.
 */
function belongsToNextLine(previous: RecognizedRegion, next: RecognizedRegion): boolean {
  if (!isKoreanFragment(previous.text) || !isKoreanFragment(next.text)) return false;
  const top = boundsOf(previous);
  const bottom = boundsOf(next);
  const lineHeight = Math.max(top.height, bottom.height);
  const verticalGap = bottom.top - top.bottom;
  if (verticalGap < -lineHeight * 0.2 || verticalGap > lineHeight * 0.9) return false;
  const horizontalOverlap = Math.max(0, Math.min(top.right, bottom.right) - Math.max(top.left, bottom.left));
  const minimumWidth = Math.min(top.width, bottom.width);
  return minimumWidth > 0 && horizontalOverlap / minimumWidth >= 0.3;
}

/** 같은 줄 병합이 끝난 영역들 중, 줄바꿈으로 이어지는 같은 캡션끼리 한 번 더 묶는다. */
function mergeWrappedLines(lines: RecognizedRegion[]): RecognizedRegion[] {
  const sorted = [...lines].sort((left, right) => boundsOf(left).top - boundsOf(right).top);
  const merged: RecognizedRegion[] = [];
  let group: RecognizedRegion[] = [];

  for (const line of sorted) {
    if (group.length === 0 || belongsToNextLine(group[group.length - 1], line)) {
      group.push(line);
      continue;
    }
    merged.push(mergeGroup(group, ' '));
    group = [line];
  }
  if (group.length > 0) merged.push(mergeGroup(group, ' '));
  return merged;
}

/** 같은 줄에서 분절된 한글 OCR box를 하나의 문구로 결합하고, 줄바꿈된 같은 캡션도 이어 붙인다. */
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
    merged.push(mergeGroup(group, ''));
    group = [region];
  }
  if (group.length > 0) merged.push(mergeGroup(group, ''));
  return mergeWrappedLines(merged);
}
