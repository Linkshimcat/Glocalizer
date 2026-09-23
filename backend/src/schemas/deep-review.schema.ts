import { z } from 'zod';

export const deepReviewRequestSchema = z.object({
  projects: z.array(z.object({
    kind: z.enum(['localization', 'generation']),
    id: z.uuid(),
  })).min(1).max(3),
  locale: z.enum(['ko', 'en', 'ja', 'zh']).default('ko'),
});

export type DeepReviewRequest = z.infer<typeof deepReviewRequestSchema>;

export const deepReviewResponseSchema = z.object({
  readinessScore: z.number().int().min(0).max(100),
  summary: z.string().min(1).max(600),
  strengths: z.array(z.string().min(1).max(300)).min(1).max(4),
  priorityFixes: z.array(z.object({
    title: z.string().min(1).max(120),
    reason: z.string().min(1).max(400),
    action: z.string().min(1).max(400),
  })).min(1).max(4),
  imageFeedback: z.array(z.object({
    imageName: z.string().min(1).max(200),
    feedback: z.string().min(1).max(500),
  })).max(6),
  localizationFeedback: z.array(z.object({
    language: z.string().min(1).max(80),
    feedback: z.string().min(1).max(500),
  })).max(6),
  disclaimer: z.string().min(1).max(300),
});

export type DeepReviewResponse = z.infer<typeof deepReviewResponseSchema>;
