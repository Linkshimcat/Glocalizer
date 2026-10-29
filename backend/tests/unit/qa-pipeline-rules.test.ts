import { describe, expect, it } from 'vitest';
import { inspectPipeline } from '../../src/qa/pipeline-rules.js';
import { findingFor, makeAssetInput } from '../helpers/qa-fixtures.js';

const ID = 'asset-1';
const region = (overrides: Record<string, unknown> = {}) => ({
  id: 'r1', detected_text: '안녕', confidence: 0.95, bbox: { x: 10, y: 20, width: 100, height: 40 },
  contains_korean: true, needs_manual_review: false, is_primary: true, ...overrides,
});
const translation = (language: 'en' | 'ja' | 'zh', text = 'Hello') => ({
  ocr_region_id: 'r1', language_code: language, final_candidates: [{ text, tone: 'cute', meaning: '인사', best: true }],
});

function run(overrides: Parameters<typeof makeAssetInput>[1], languages: Array<'en' | 'ja' | 'zh'> = ['en'], cleanupResolved = false) {
  return inspectPipeline(makeAssetInput(ID, overrides), languages, cleanupResolved);
}

describe('inspectPipeline', () => {
  it('정상 에셋은 OCR·번역·정리 항목이 모두 pass다', () => {
    const findings = run({ regions: [region()], translations: [translation('en')] });
    expect(findings.map((f) => [f.code, f.severity])).toEqual([
      ['OCR_LOW_CONFIDENCE', 'pass'],
      ['TRANSLATION_MISSING', 'pass'],
      ['CLEANUP_MANUAL_REQUIRED', 'pass'],
    ]);
  });

  it.each([
    ['OCR_TEXT_NOT_FOUND', 'OCR_NO_TEXT'],
    ['OCR_KOREAN_NOT_FOUND', 'OCR_NO_TEXT'],
    ['TRANSLATION_PROVIDER_FAILED', 'TRANSLATION_MISSING'],
    ['IMAGE_CLEANUP_FAILED', 'CLEANUP_MANUAL_REQUIRED'],
    ['IMAGE_DECODE_FAILED', 'IMAGE_LOAD_FAILED'],
    ['SOMETHING_ELSE', 'IMAGE_LOAD_FAILED'],
  ] as const)('파이프라인에서 실패한 에셋(%s)은 %s fail 하나만 낸다', (errorCode, code) => {
    const findings = run({ asset: { status: 'failed', error_code: errorCode, error_message: '실패' } as never, regions: [], translations: [] });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ code, severity: 'fail', source: 'rule', imageId: ID });
  });

  it('완료됐는데 한글 영역이 하나도 없으면 OCR_NO_TEXT review다 (글자 없는 이미지일 수 있어 fail로 막지 않는다)', () => {
    const findings = run({ regions: [region({ contains_korean: false })], translations: [] });
    expect(findingFor(findings, 'OCR_NO_TEXT').severity).toBe('review');
    expect(findings.some((f) => f.code === 'TRANSLATION_MISSING')).toBe(false);
  });

  it.each([
    [0.49, 'fail'],
    [0.5, 'review'],
    [0.74, 'review'],
    [0.75, 'pass'],
    [0.99, 'pass'],
  ] as const)('OCR 신뢰도 %f는 OCR_LOW_CONFIDENCE %s', (confidence, severity) => {
    const finding = findingFor(run({ regions: [region({ confidence })], translations: [translation('en')] }), 'OCR_LOW_CONFIDENCE');
    expect(finding.severity).toBe(severity);
    expect(finding.measuredValue).toBe(confidence);
    expect(finding.region).toEqual({ x: 10, y: 20, width: 100, height: 40 });
  });

  it('신뢰도가 높아도 OCR이 수동 확인을 요구했으면 review다', () => {
    const finding = findingFor(run({ regions: [region({ confidence: 0.97, needs_manual_review: true })], translations: [translation('en')] }), 'OCR_LOW_CONFIDENCE');
    expect(finding.severity).toBe('review');
  });

  it('요청한 언어 중 번역이 없는 언어만 TRANSLATION_MISSING fail이다', () => {
    const findings = run({ regions: [region()], translations: [translation('en')] }, ['en', 'ja']);
    const bySeverity = findings.filter((f) => f.code === 'TRANSLATION_MISSING').map((f) => [f.measuredValue, f.severity]);
    expect(bySeverity).toEqual([['en', 'pass'], ['ja', 'fail']]);
  });

  it('후보 문구가 공백뿐이면 번역이 없는 것으로 본다', () => {
    const findings = run({ regions: [region()], translations: [translation('en', '   ')] });
    expect(findingFor(findings, 'TRANSLATION_MISSING').severity).toBe('fail');
  });

  it.each([
    [true, false, 'fail'],
    [true, true, 'pass'], // 에디터에서 수동 정리를 적용함
    [false, false, 'pass'],
  ] as const)('needs_manual_cleanup=%s, 수동 정리 적용=%s 이면 CLEANUP_MANUAL_REQUIRED %s', (needs, resolved, severity) => {
    const findings = run({ asset: { needs_manual_cleanup: needs } as never, regions: [region()], translations: [translation('en')] }, ['en'], resolved);
    expect(findingFor(findings, 'CLEANUP_MANUAL_REQUIRED').severity).toBe(severity);
  });
});

describe('inspectPipeline: 깨진 DB 값', () => {
  it('final_candidates가 배열이 아니어도 던지지 않고 번역 없음으로 판정한다', () => {
    const findings = run({ regions: [region()], translations: [{ ocr_region_id: 'r1', language_code: 'en', final_candidates: null as never }] });
    expect(findingFor(findings, 'TRANSLATION_MISSING').severity).toBe('fail');
  });
});
