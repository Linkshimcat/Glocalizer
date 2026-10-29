import { describe, expect, it } from 'vitest';
import { carryOverSpecFindings } from '../../src/qa/engine.js';
import { SPEC_LOAD_FAILED_CRITERION } from '../../src/qa/spec-rules.js';
import type { QaFinding, QaReport } from '../../src/types/qa.js';

const f = (imageId: string, code: QaFinding['code'], severity: QaFinding['severity'] = 'pass'): QaFinding => ({ code, severity, source: 'rule', imageId, message: 'm' });
const report = (findings: QaFinding[]): QaReport => ({ id: 'r1', projectId: 'p', imageRevision: 'x', inspectedAt: '2026-10-29T00:00:00.000Z', rulesetVersion: 'v', findings });

describe('carryOverSpecFindings', () => {
  it('이번에 PNG를 받지 않은 에셋만 직전 리포트의 규격 판정을 가져온다', () => {
    const previous = report([
      f('a', 'SPEC_FORMAT'), f('a', 'SPEC_FILE_SIZE', 'fail'), f('a', 'TEXT_OVERFLOW', 'fail'),
      f('b', 'SPEC_FORMAT'), f('c', 'SPEC_DIMENSIONS', 'fail'),
    ]);
    const carried = carryOverSpecFindings(previous, ['a', 'c']);
    expect(carried.map((x) => [x.imageId, x.code, x.severity])).toEqual([
      ['a', 'SPEC_FORMAT', 'pass'], ['a', 'SPEC_FILE_SIZE', 'fail'], ['c', 'SPEC_DIMENSIONS', 'fail'],
    ]);
  });

  it('직전에 PNG를 못 읽었던 기록(IMAGE_LOAD_FAILED + 규격 판정 없음)도 그대로 가져온다', () => {
    const previous = report([{ ...f('a', 'IMAGE_LOAD_FAILED', 'fail'), criterion: SPEC_LOAD_FAILED_CRITERION }]);
    expect(carryOverSpecFindings(previous, ['a'])).toHaveLength(1);
  });

  it('파이프라인 실패로 생긴 IMAGE_LOAD_FAILED는 가져오지 않는다 (이번 검사에서 DB 상태로 다시 판정한다)', () => {
    const previous = report([{ ...f('a', 'IMAGE_LOAD_FAILED', 'fail'), measuredValue: 'IMAGE_DECODE_FAILED' }]);
    expect(carryOverSpecFindings(previous, ['a'])).toEqual([]);
  });

  it('직전 리포트가 없으면 아무것도 가져오지 않는다', () => {
    expect(carryOverSpecFindings(null, ['a'])).toEqual([]);
  });
});
