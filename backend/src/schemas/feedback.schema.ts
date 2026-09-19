import { z } from 'zod';

export const FEEDBACK_CATEGORIES = ['bug', 'feature', 'other'] as const;

export const feedbackSchema = z.object({
  category: z.enum(FEEDBACK_CATEGORIES),
  message: z
    .string()
    .trim()
    .min(10, '피드백은 10자 이상 입력해주세요.')
    .max(2000, '피드백은 2000자 이하로 입력해주세요.'),
});

export type FeedbackInput = z.infer<typeof feedbackSchema>;
