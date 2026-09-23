import { z } from 'zod';

export const deepReviewRequestSchema = z.object({
  projects: z.array(z.object({
    kind: z.enum(['localization', 'generation']),
    id: z.uuid(),
  })).min(1).max(3),
  locale: z.enum(['ko', 'en', 'ja', 'zh']).default('ko'),
});

export type DeepReviewRequest = z.infer<typeof deepReviewRequestSchema>;

/** 모델이 길이·개수 상한을 넘겨도 응답 전체를 버리지 않는다. 프롬프트로 상한을 일러주지만
 *  지키지 않는 경우가 있고, 그때마다 검토가 통째로 실패하는 편이 잘라 쓰는 것보다 나쁘다.
 *  상한은 UI가 감당할 분량을 정하는 값이지 응답의 유효성을 가르는 값이 아니다. */
const cappedText = (max: number) => z.string().min(1).transform(value => value.slice(0, max));
const cappedList = <T extends z.ZodTypeAny>(item: T, max: number) =>
  z.array(item).transform(value => value.slice(0, max));

export const deepReviewResponseSchema = z.object({
  readinessScore: z.number().transform(value => Math.min(100, Math.max(0, Math.round(value)))),
  summary: cappedText(600),
  strengths: cappedList(cappedText(300), 4),
  priorityFixes: cappedList(z.object({
    title: cappedText(120),
    reason: cappedText(400),
    action: cappedText(400),
  }), 4),
  imageFeedback: cappedList(z.object({
    imageName: cappedText(200),
    feedback: cappedText(500),
  }), 6),
  localizationFeedback: cappedList(z.object({
    language: cappedText(80),
    feedback: cappedText(500),
  }), 6),
  disclaimer: cappedText(300),
});

export type DeepReviewResponse = z.infer<typeof deepReviewResponseSchema>;
