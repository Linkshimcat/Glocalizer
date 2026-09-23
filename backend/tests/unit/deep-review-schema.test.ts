import { describe, expect, it } from 'vitest';
import { deepReviewRequestSchema, deepReviewResponseSchema } from '../../src/schemas/deep-review.schema.js';

const project = { kind: 'localization' as const, id: '550e8400-e29b-41d4-a716-446655440000' };

describe('deep review schemas', () => {
  it('분석 프로젝트를 1개 이상 3개 이하로 제한한다', () => {
    expect(deepReviewRequestSchema.safeParse({ projects: [], locale: 'ko' }).success).toBe(false);
    expect(deepReviewRequestSchema.safeParse({ projects: [project, project, project], locale: 'ko' }).success).toBe(true);
    expect(deepReviewRequestSchema.safeParse({ projects: [project, project, project, project], locale: 'ko' }).success).toBe(false);
  });

  const response = {
    readinessScore: 82,
    summary: '출시 전 가독성을 조금 더 다듬어 보세요.',
    strengths: ['표정과 문구가 잘 어울립니다.'],
    priorityFixes: [{ title: '글자 크기', reason: '작은 화면에서 흐립니다.', action: '글자를 키워주세요.' }],
    imageFeedback: [],
    localizationFeedback: [],
    disclaimer: 'AI 참고 의견이며 OGQ 승인을 보장하지 않습니다.',
  };

  it('정상 응답을 그대로 통과시킨다', () => {
    expect(deepReviewResponseSchema.safeParse(response).success).toBe(true);
  });

  // 상한은 UI가 감당할 분량을 정하는 값이지 응답의 유효성을 가르는 값이 아니다. 모델이
  // 상한을 넘겼다고 검토 전체를 버리면 사용자는 아무것도 받지 못한다.
  it('범위를 벗어난 점수를 버리지 않고 0~100으로 맞춘다', () => {
    expect(deepReviewResponseSchema.parse({ ...response, readinessScore: 101 }).readinessScore).toBe(100);
    expect(deepReviewResponseSchema.parse({ ...response, readinessScore: -8 }).readinessScore).toBe(0);
    expect(deepReviewResponseSchema.parse({ ...response, readinessScore: 82.6 }).readinessScore).toBe(83);
  });

  it('개수 상한을 넘긴 배열을 버리지 않고 잘라 쓴다', () => {
    const parsed = deepReviewResponseSchema.parse({
      ...response,
      strengths: Array.from({ length: 7 }, (_, index) => `강점 ${index + 1}`),
      priorityFixes: Array.from({ length: 6 }, () => response.priorityFixes[0]),
      imageFeedback: Array.from({ length: 9 }, (_, index) => ({ imageName: `${index}.png`, feedback: '더 크게' })),
    });
    expect(parsed.strengths).toHaveLength(4);
    expect(parsed.priorityFixes).toHaveLength(4);
    expect(parsed.imageFeedback).toHaveLength(6);
  });

  it('길이 상한을 넘긴 문자열을 버리지 않고 잘라 쓴다', () => {
    const parsed = deepReviewResponseSchema.parse({ ...response, summary: '가'.repeat(900), disclaimer: '나'.repeat(500) });
    expect(parsed.summary).toHaveLength(600);
    expect(parsed.disclaimer).toHaveLength(300);
  });

  it('빈 문자열이나 필드 누락은 그대로 거절한다', () => {
    expect(deepReviewResponseSchema.safeParse({ ...response, summary: '' }).success).toBe(false);
    expect(deepReviewResponseSchema.safeParse({ ...response, disclaimer: undefined }).success).toBe(false);
  });
});
