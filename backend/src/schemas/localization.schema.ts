import { z } from 'zod';

const translationCandidateSchema = z.object({
  text: z.string().min(1),
  tone: z.string().min(1),
  meaning: z.string().min(1),
  best: z.boolean(),
});

export const glmTranslationResponseSchema = z.object({
  candidates: z.array(translationCandidateSchema).length(3),
  recommendedStyle: z.object({
    fontCategory: z.enum(['bold', 'comic', 'cute', 'handwriting', 'minimal']),
    alignment: z.enum(['left', 'center', 'right']),
    strokeRecommended: z.boolean(),
    shadowRecommended: z.boolean(),
  }),
});

export type GlmTranslationResponse = z.infer<typeof glmTranslationResponseSchema>;
