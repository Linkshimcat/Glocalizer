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

  GROQ_API_KEY: z.string().min(1).optional(),
  GROQ_MODEL: z.string().default('llama-3.3-70b-versatile'),
  GROQ_BASE_URL: z.string().url().default('https://api.groq.com/openai/v1'),
  TRANSLATION_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
  TRANSLATION_PROVIDER: z.enum(['groq']).default('groq'),

  OCR_PROVIDER: z.enum(['paddle']).default('paddle'),
  OCR_PYTHON_EXECUTABLE: z.string().default('python3'),
  OCR_TIMEOUT_MS: z.coerce.number().int().positive().default(20_000),
  OCR_IMAGE_MAX_DIMENSION: z.coerce.number().int().min(512).max(4096).default(1600),
  GEMINI_API_KEY: z.string().min(1).optional(),
  GEMINI_VISION_MODEL: z.string().default('gemini-2.5-flash'),
  VISION_TIMEOUT_MS: z.coerce.number().int().positive().default(12_000),

  AI_MAX_RETRIES: z.coerce.number().int().positive().default(1),
  AI_CONCURRENCY: z.coerce.number().int().positive().default(4),
  CLEANUP_CONCURRENCY: z.coerce.number().int().positive().default(4),

  WORKER_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(2000),
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
