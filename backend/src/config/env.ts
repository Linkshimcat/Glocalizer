import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  FRONTEND_ORIGIN: z.string().default('http://localhost:5173'),

  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_STORAGE_BUCKET: z.string().default('glocalizer-private'),

  PROJECT_EXPIRY_HOURS: z.coerce.number().int().positive().default(24),
  MAX_FILES_PER_PROJECT: z.coerce.number().int().positive().default(20),
  MAX_FILE_SIZE_MB: z.coerce.number().positive().default(5),
  MAX_IMAGE_WIDTH: z.coerce.number().int().positive().default(4096),
  MAX_IMAGE_HEIGHT: z.coerce.number().int().positive().default(4096),

  PROJECT_TOKEN_SECRET: z.string().min(16, 'PROJECT_TOKEN_SECRET must be at least 16 characters'),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  // NVIDIA — 값이 비어 있어도 서버는 기동되며, 실제로 OCR/번역을 호출하는 시점에 개별 에러로 드러난다.
  NVIDIA_API_KEY: z.string().optional(),
  NVIDIA_OCR_API_KEY: z.string().optional(),
  NVIDIA_OCR_BASE_URL: z.string().optional(),
  NVIDIA_OCR_MODEL: z.string().default('nvidia/nemotron-ocr-v2'),
  OCR_CONFIDENCE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.75),
  OCR_REVIEW_THRESHOLD: z.coerce.number().min(0).max(1).default(0.85),

  NVIDIA_LLM_BASE_URL: z.string().default('https://integrate.api.nvidia.com/v1'),
  NVIDIA_TRANSLATION_API_KEY: z.string().optional(),
  NVIDIA_TRANSLATION_MODEL: z.string().default('z-ai/glm-5.2'),
  NVIDIA_REVIEW_API_KEY: z.string().optional(),
  NVIDIA_REVIEW_MODEL: z.string().default('deepseek-ai/deepseek-v4-pro'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  // eslint-disable-next-line no-console
  console.error(`Invalid environment configuration:\n${issues}`);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  MAX_FILE_SIZE_BYTES: Math.round(parsed.data.MAX_FILE_SIZE_MB * 1024 * 1024),
};
