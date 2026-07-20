import { z } from 'zod';

const scoreSchema = z.object({
  index: z.number().int().min(0),
  naturalness: z.number().min(0).max(100),
  meaningPreservation: z.number().min(0).max(100),
  culturalFit: z.number().min(0).max(100),
  lengthFit: z.number().min(0).max(100),
  safety: z.number().min(0).max(100),
});

const replacementSchema = z.object({
  index: z.number().int().min(0),
  text: z.string().min(1),
  reason: z.string(),
});

export const deepseekReviewResponseSchema = z.object({
  approved: z.boolean(),
  bestCandidateIndex: z.number().int().min(0),
  scores: z.array(scoreSchema),
  warnings: z.array(z.string()).default([]),
  replacements: z.array(replacementSchema).default([]),
});

export type DeepseekReviewResponse = z.infer<typeof deepseekReviewResponseSchema>;
