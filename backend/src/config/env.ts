import 'dotenv/config';
import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  FRONTEND_ORIGIN: z.string().default('http://localhost:5173'),

  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_STORAGE_BUCKET: z.string().default('glocalizer-private'),
  // backend runtime은 Supabase REST를 사용한다. 이 값은 numbered migration runner에서만 사용하며
  // WSL에서는 Supabase Session Pooler URI를 권장한다.
  DATABASE_URL: z.string().url().optional(),

  PROJECT_EXPIRY_HOURS: z.coerce.number().int().positive().default(24),
  MAX_FILES_PER_PROJECT: z.coerce.number().int().positive().default(20),
  MAX_FILE_SIZE_MB: z.coerce.number().positive().default(5),
  MAX_IMAGE_WIDTH: z.coerce.number().int().positive().default(4096),
  MAX_IMAGE_HEIGHT: z.coerce.number().int().positive().default(4096),

  PROJECT_TOKEN_SECRET: z.string().min(16, 'PROJECT_TOKEN_SECRET must be at least 16 characters'),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  GROQ_API_KEY: z.string().min(1).optional(),
  GROQ_MODEL: z.string().default('llama-3.3-70b-versatile'),
  GROQ_BASE_URL: z.string().url().default('https://api.groq.com/openai/v1'),
  TRANSLATION_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
  TRANSLATION_PROVIDER: z.enum(['groq']).default('groq'),

  OCR_PROVIDER: z.enum(['paddle', 'openvino-npu']).default('paddle'),
  OCR_SHADOW_PROVIDER: z.enum(['none', 'openvino-npu']).default('none'),
  OCR_SHADOW_MAX_VARIANTS: z.coerce.number().int().min(1).max(3).default(2),
  OCR_PYTHON_EXECUTABLE: z.string().default('python3'),
  OCR_WINDOWS_PYTHON: z.string().default('py'),
  OCR_TIMEOUT_MS: z.coerce.number().int().positive().default(90_000),
  OCR_IMAGE_MAX_DIMENSION: z.coerce.number().int().min(512).max(4096).default(1280),
  GEMINI_API_KEY: z.string().min(1).optional(),
  GEMINI_VISION_MODEL: z.string().default('gemini-2.5-flash'),
  VISION_PROVIDER: z.enum(['groq', 'gemini']).default('groq'),
  GROQ_VISION_MODEL: z.string().default('qwen/qwen3.6-27b'),
  VISION_TIMEOUT_MS: z.coerce.number().int().positive().default(25_000),
  // 원본 글자 이미지를 분석해 번역 폰트를 원본과 비슷하게 고르는 기능. 번역과 병렬로 도는
  // 별도 Vision 호출이 하나 더 붙는 거라, 문제가 생기면 재배포 없이 바로 끌 수 있게 플래그로 뺐다.
  ENABLE_FONT_STYLE_ANALYSIS: z.string().default('true').transform((v) => v === 'true'),

  AI_MAX_RETRIES: z.coerce.number().int().min(1).max(5).default(3),
  AI_CONCURRENCY: z.coerce.number().int().min(1).max(8).default(2),
  CLEANUP_CONCURRENCY: z.coerce.number().int().positive().default(4),

  WORKER_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(2000),
  JOB_STALE_AFTER_MS: z.coerce.number().int().positive().default(5 * 60 * 1000),
  JOB_HEARTBEAT_INTERVAL_MS: z.coerce.number().int().positive().default(20_000),
  JOB_RECOVERY_SWEEP_INTERVAL_MS: z.coerce.number().int().positive().default(30_000),
  WORKER_ID: z.string().optional(),
  SHUTDOWN_GRACE_MS: z.coerce.number().int().positive().default(25_000),
  MAX_REGENERATE_COUNT: z.coerce.number().int().positive().default(3),
  CLEANUP_SWEEP_INTERVAL_MS: z.coerce.number().int().positive().default(30 * 60 * 1000),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(60),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  console.error(`Invalid environment configuration:\n${issues}`);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  MAX_FILE_SIZE_BYTES: Math.round(parsed.data.MAX_FILE_SIZE_MB * 1024 * 1024),
};
