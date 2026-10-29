import type { PixelBox } from '../utils/bbox.js';
import type { QaFinding } from '../types/qa.js';
import { OUTSIDE_CAPTION_FAIL_RATIO } from './constants.js';
import type { QaEditorStateRow } from './inputs.js';

interface LayoutMetric {
  overflowPx: number;
  outsideCaptionRatio: number;
  fontSizePx: number;
}

const isNonNegativeNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;

/** 에디터가 editor state에 저장한 layoutMetrics(프런트 lib/autoFit.ts). 클라이언트가 보낸 JSON이라 모양을 확인하고 쓴다. */
function parseLayoutMetric(value: unknown): LayoutMetric | null {
  if (typeof value !== 'object' || value === null) return null;
  const { overflowPx, outsideCaptionRatio, fontSizePx } = value as Record<string, unknown>;
  if (!isNonNegativeNumber(overflowPx) || !isNonNegativeNumber(outsideCaptionRatio) || !isNonNegativeNumber(fontSizePx)) return null;
  return { overflowPx, outsideCaptionRatio, fontSizePx };
}

/**
 * 글자 넘침은 브라우저 폰트로만 정확히 잴 수 있어 에디터가 재서 저장한 값을 읽는다.
 * 측정값이 없는 (영역, 언어)는 finding을 만들지 않는다 — 재지 않은 항목을 pass로 꾸미지 않기 위해서다.
 * 단위: overflowPx는 에디터 미리보기 340px 정사각 좌표계 기준, outsideCaptionRatio는 비율이다.
 */
export function inspectLayout(imageId: string, regions: Array<{ id: string; bbox: PixelBox }>, editorStates: QaEditorStateRow[]): QaFinding[] {
  const findings: QaFinding[] = [];
  for (const state of editorStates) {
    const region = regions.find((candidate) => candidate.id === state.ocr_region_id);
    const metric = region ? parseLayoutMetric(state.style.layoutMetrics) : null;
    if (!region || !metric) continue;

    const overflowed = metric.overflowPx > 0;
    findings.push({
      code: 'TEXT_OVERFLOW', severity: overflowed ? 'fail' : 'pass', source: 'rule', imageId, region: region.bbox,
      message: overflowed ? `${state.language_code} 번역 글자가 박스를 ${metric.overflowPx}px 넘칩니다.` : `${state.language_code} 번역 글자가 박스 안에 들어옵니다.`,
      measuredValue: metric.overflowPx, criterion: '넘침 0px (에디터 340px 기준)',
      ...(overflowed ? { recommendation: '자동 배치를 다시 실행하거나 글자 크기를 줄여 주세요.' } : {}),
    });

    const outside = metric.outsideCaptionRatio >= OUTSIDE_CAPTION_FAIL_RATIO;
    findings.push({
      code: 'TEXT_OUTSIDE_CAPTION', severity: outside ? 'fail' : 'pass', source: 'rule', imageId, region: region.bbox,
      message: outside ? `${state.language_code} 번역 글자가 원래 캡션 영역을 크게 벗어납니다.` : `${state.language_code} 번역 글자가 캡션 영역 근처에 있습니다.`,
      measuredValue: metric.outsideCaptionRatio, criterion: `캡션 밖 비율 < ${OUTSIDE_CAPTION_FAIL_RATIO}`,
      ...(outside ? { recommendation: '글자를 캡션 위치로 옮기거나 줄바꿈을 늘려 주세요.' } : {}),
    });
  }
  return findings;
}
