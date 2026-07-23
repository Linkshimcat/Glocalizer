import { z } from 'zod';
import { env } from '../config/env.js';

export const targetLanguageSchema = z.enum(['en', 'ja', 'zh']);

const localizationOptionsSchema = z.object({
  tone: z.enum(['cute', 'funny', 'energetic', 'serious', 'sarcastic']).default('funny'),
  audience: z.enum(['general', 'teen', 'business']).default('teen'),
  translationStyle: z.enum(['natural', 'trendy', 'literal']).default('trendy'),
  highQualityReview: z.boolean().default(false),
});

const uploadFileSchema = z.object({
  clientId: z.string().min(1),
  name: z.string().min(1).max(255),
  mimeType: z.enum(['image/png', 'image/jpeg']),
  size: z
    .number()
    .int()
    .positive()
    .max(env.MAX_FILE_SIZE_BYTES, `파일 크기는 ${env.MAX_FILE_SIZE_MB}MB를 초과할 수 없습니다.`),
});

export const createProjectSchema = z.object({
  targetLanguages: z.array(targetLanguageSchema).min(1).max(3),
  options: localizationOptionsSchema.default(() => ({
    tone: 'funny' as const,
    audience: 'teen' as const,
    translationStyle: 'trendy' as const,
    highQualityReview: false,
  })),
  files: z
    .array(uploadFileSchema)
    .min(1)
    .max(env.MAX_FILES_PER_PROJECT, `프로젝트당 이미지는 최대 ${env.MAX_FILES_PER_PROJECT}개까지 업로드할 수 있습니다.`),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
