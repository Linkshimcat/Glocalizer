import { describe, expect, it } from 'vitest';
import { capAiSuggestionSeverity, countVerdicts } from '../../src/qa/findings.js';
import type { EvidenceSource, QaFinding, Severity } from '../../src/types/qa.js';

const finding = (imageId: string, severity: Severity, source: EvidenceSource = 'rule'): QaFinding => ({
  code: source === 'ai_suggestion' ? 'AI_READABILITY' : 'SPEC_FORMAT', severity, source, imageId, message: 'm',
});

describe('capAiSuggestionSeverity', () => {
  it.each([
    ['fail', 'review'],
    ['review', 'review'],
    ['pass', 'pass'],
  ] as const)('모델 의견 %s는 %s로 제한한다 (AI 의견은 절대 fail로 올리지 않는다)', (from, to) => {
    expect(capAiSuggestionSeverity(finding('a', from, 'ai_suggestion')).severity).toBe(to);
  });

  it.each(['rule', 'user'] as const)('%s 출처의 fail은 그대로 둔다', (source) => {
    expect(capAiSuggestionSeverity(finding('a', 'fail', source)).severity).toBe('fail');
  });
});

describe('countVerdicts', () => {
  it('이미지별 최종 판정(가장 나쁜 severity)을 세고, finding이 없는 검사 대상 이미지는 pass로 센다', () => {
    const findings = [
      finding('a', 'pass'), finding('a', 'review'),
      finding('b', 'fail'), finding('b', 'pass'), finding('b', 'review'),
      finding('d', 'pass'), finding('d', 'pass'),
      finding('not-inspected', 'fail'),
    ];
    expect(countVerdicts(findings, ['a', 'b', 'c', 'd'])).toEqual({ pass: 2, review: 1, fail: 1 });
  });

  it('검사한 이미지가 없으면 모두 0이다', () => {
    expect(countVerdicts([], [])).toEqual({ pass: 0, review: 0, fail: 0 });
  });
});
