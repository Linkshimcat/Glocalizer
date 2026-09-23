import { describe, expect, it } from 'vitest';
import { deepReviewRequestSchema, deepReviewResponseSchema } from '../../src/schemas/deep-review.schema.js';

const project = { kind: 'localization' as const, id: '550e8400-e29b-41d4-a716-446655440000' };

describe('deep review schemas', () => {
  it('분석 프로젝트를 1개 이상 3개 이하로 제한한다', () => {
    expect(deepReviewRequestSchema.safeParse({ projects: [], locale: 'ko' }).success).toBe(false);
    expect(deepReviewRequestSchema.safeParse({ projects: [project, project, project], locale: 'ko' }).success).toBe(true);
    expect(deepReviewRequestSchema.safeParse({ projects: [project, project, project, project], locale: 'ko' }).success).toBe(false);
  });

  it('준비도 점수와 피드백 배열의 범위를 검증한다', () => {
    const response = {
      readinessScore: 82,
      summary: '출시 전 가독성을 조금 더 다듬어 보세요.',
      strengths: ['표정과 문구가 잘 어울립니다.'],
      priorityFixes: [{ title: '글자 크기', reason: '작은 화면에서 흐립니다.', action: '글자를 키워주세요.' }],
      imageFeedback: [],
      localizationFeedback: [],
      disclaimer: 'AI 참고 의견이며 OGQ 승인을 보장하지 않습니다.',
    };

    expect(deepReviewResponseSchema.safeParse(response).success).toBe(true);
    expect(deepReviewResponseSchema.safeParse({ ...response, readinessScore: 101 }).success).toBe(false);
  });
});
