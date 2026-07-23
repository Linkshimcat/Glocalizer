import { z } from 'zod';

const translationCandidateSchema = z.object({
  text: z.string().min(1),
  // OpenAI-compatible 모델은 부가 설명 필드를 생략하는 경우가 있다.
  // 번역 text가 핵심 결과이므로 안전한 기본값을 보완한다.
  tone: z.string().min(1).optional().default('natural'),
  meaning: z.string().optional().default(''),
  // Groq 같은 OpenAI-compatible provider는 false 값을 생략할 수 있다.
  best: z.boolean().optional().default(false),
});

export const translationResponseSchema = z.object({
  candidates: z.array(translationCandidateSchema).min(1).max(3),
  recommendedStyle: z.object({
    fontCategory: z.enum(['bold', 'comic', 'cute', 'handwriting', 'minimal']).optional().default('bold'),
    alignment: z.enum(['left', 'center', 'right']).optional().default('center'),
    strokeRecommended: z.boolean().optional().default(false),
    shadowRecommended: z.boolean().optional().default(false),
  }),
});

export const translationBatchResponseSchema = z.object({
  translations: z.array(
    z.object({
      languageCode: z.enum(['en', 'ja', 'zh']),
      candidates: z.array(translationCandidateSchema).min(1).max(3),
      recommendedStyle: z.object({
        fontCategory: z.enum(['bold', 'comic', 'cute', 'handwriting', 'minimal']).optional().default('bold'),
        alignment: z.enum(['left', 'center', 'right']).optional().default('center'),
        strokeRecommended: z.boolean().optional().default(false),
        shadowRecommended: z.boolean().optional().default(false),
      }),
    }),
  ).min(1).max(3),
});

export type TranslationResponse = z.infer<typeof translationResponseSchema>;
