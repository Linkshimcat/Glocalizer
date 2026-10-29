import { describe, expect, it } from 'vitest';
import { inspectLayout } from '../../src/qa/layout-rules.js';
import { findingFor } from '../helpers/qa-fixtures.js';

const ID = 'asset-1';
const BBOX = { x: 10, y: 20, width: 100, height: 40 };
const regions = [{ id: 'r1', bbox: BBOX }];
const state = (layoutMetrics: unknown, overrides: Record<string, unknown> = {}) => ({
  ocr_region_id: 'r1', language_code: 'en', style: { size: 30, ...(layoutMetrics === undefined ? {} : { layoutMetrics }) }, ...overrides,
});

describe('inspectLayout', () => {
  it('측정값이 없으면 아무 finding도 만들지 않는다 (측정하지 않은 항목을 pass로 꾸미지 않는다)', () => {
    expect(inspectLayout(ID, regions, [state(undefined)])).toEqual([]);
  });

  it('넘침이 있으면 TEXT_OVERFLOW fail이고 실측 px와 OCR 영역을 담는다', () => {
    const finding = findingFor(inspectLayout(ID, regions, [state({ overflowPx: 12, outsideCaptionRatio: 0.1, fontSizePx: 24 })]), 'TEXT_OVERFLOW');
    expect(finding).toMatchObject({ severity: 'fail', source: 'rule', imageId: ID, measuredValue: 12, region: BBOX });
    expect(finding.message).toContain('en');
  });

  it('넘침이 0이면 TEXT_OVERFLOW pass다', () => {
    const findings = inspectLayout(ID, regions, [state({ overflowPx: 0, outsideCaptionRatio: 0, fontSizePx: 24 })]);
    expect(findingFor(findings, 'TEXT_OVERFLOW').severity).toBe('pass');
  });

  it.each([
    [0.3, 'fail'],
    [0.299, 'pass'], // 작은 넘침은 TEXT_OVERFLOW가 따로 잡는다
    [0, 'pass'],
  ] as const)('캡션 밖 비율 %f는 TEXT_OUTSIDE_CAPTION %s', (outsideCaptionRatio, severity) => {
    const findings = inspectLayout(ID, regions, [state({ overflowPx: 5, outsideCaptionRatio, fontSizePx: 24 })]);
    expect(findingFor(findings, 'TEXT_OUTSIDE_CAPTION').severity).toBe(severity);
  });

  it.each([
    ['문자열', { overflowPx: '12', outsideCaptionRatio: 0, fontSizePx: 24 }],
    ['음수', { overflowPx: -1, outsideCaptionRatio: 0, fontSizePx: 24 }],
    ['NaN', { overflowPx: Number.NaN, outsideCaptionRatio: 0, fontSizePx: 24 }],
    ['필드 누락', { overflowPx: 3 }],
    ['객체 아님', 'overflow'],
    ['null', null],
  ])('형식이 틀린 측정값(%s)은 무시한다 — 클라이언트가 보낸 JSON이라 그대로 믿지 않는다', (_label, metrics) => {
    expect(inspectLayout(ID, regions, [state(metrics)])).toEqual([]);
  });

  it('이 에셋에 없는 영역의 편집 상태는 건너뛴다', () => {
    expect(inspectLayout(ID, regions, [state({ overflowPx: 9, outsideCaptionRatio: 0, fontSizePx: 24 }, { ocr_region_id: 'other' })])).toEqual([]);
  });

  it('언어마다 따로 판정한다', () => {
    const findings = inspectLayout(ID, regions, [
      state({ overflowPx: 0, outsideCaptionRatio: 0, fontSizePx: 24 }, { language_code: 'en' }),
      state({ overflowPx: 8, outsideCaptionRatio: 0, fontSizePx: 24 }, { language_code: 'ja' }),
    ]);
    const overflow = findings.filter((f) => f.code === 'TEXT_OVERFLOW').map((f) => f.severity);
    expect(overflow).toEqual(['pass', 'fail']);
  });
});
