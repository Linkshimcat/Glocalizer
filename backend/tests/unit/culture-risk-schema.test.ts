import { describe, expect, it } from 'vitest';
import { cultureRiskModelResponseSchema } from '../../src/schemas/culture-risk.schema.js';

const finding = { candidateText: '완전 급식충이네', reason: '연령 비하로 읽힐 수 있어 확인이 필요해요.', alternatives: ['대안1', '대안2', '대안3'] };

describe('culture risk schema', () => {
  it('정상 응답을 그대로 통과시킨다', () => {
    expect(cultureRiskModelResponseSchema.safeParse({ findings: [finding] }).success).toBe(true);
  });

  it('findings가 비어 있어도(위험 없음) 통과시킨다', () => {
    expect(cultureRiskModelResponseSchema.safeParse({ findings: [] }).success).toBe(true);
  });

  it('alternatives가 정확히 3개가 아니면 거절한다', () => {
    expect(cultureRiskModelResponseSchema.safeParse({ findings: [{ ...finding, alternatives: ['하나', '둘'] }] }).success).toBe(false);
    expect(cultureRiskModelResponseSchema.safeParse({ findings: [{ ...finding, alternatives: ['하나', '둘', '셋', '넷'] }] }).success).toBe(false);
  });

  it('빈 candidateText나 reason은 거절한다', () => {
    expect(cultureRiskModelResponseSchema.safeParse({ findings: [{ ...finding, candidateText: '' }] }).success).toBe(false);
    expect(cultureRiskModelResponseSchema.safeParse({ findings: [{ ...finding, reason: '' }] }).success).toBe(false);
  });

  // 길이 상한은 UI가 감당할 분량을 정하는 값이지 유효성을 가르는 값이 아니다(deep-review와 동일 원칙) —
  // 모델이 상한을 넘겼다고 결과 전체를 버리면 사용자는 아무 경고도 못 받는다.
  it('길이 상한을 넘긴 문자열을 버리지 않고 잘라 쓴다', () => {
    const parsed = cultureRiskModelResponseSchema.parse({
      findings: [{ ...finding, candidateText: '가'.repeat(300), reason: '나'.repeat(500) }],
    });
    expect(parsed.findings[0].candidateText).toHaveLength(200);
    expect(parsed.findings[0].reason).toHaveLength(400);
  });

  it('findings 개수 상한(3개)을 넘기면 잘라 쓴다', () => {
    const parsed = cultureRiskModelResponseSchema.parse({ findings: Array.from({ length: 5 }, () => finding) });
    expect(parsed.findings).toHaveLength(3);
  });
});
