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
  // 다운로드 완주 집계(GET /downloads/count)는 개별 프로젝트 토큰이 아니라 이 관리자 키로 보호한다.
  DOWNLOAD_STATS_API_KEY: z.string().min(16, 'DOWNLOAD_STATS_API_KEY must be at least 16 characters'),

  // 이메일/네이버 로그인 세션 토큰 서명 키(HS256, 자체 구현 — utils/jwt.ts).
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  // 네이버 개발자센터에서 발급. 미설정 시 네이버 로그인 API만 503으로 비활성화되고 나머지는 정상 동작한다.
  // .env에 빈 문자열로 남아있어도(NAVER_CLIENT_ID=) "미설정"으로 취급하도록 빈 문자열을 undefined로 정규화한다.
  NAVER_CLIENT_ID: z
    .string()
    .optional()
    .transform((value) => (value ? value : undefined)),
  NAVER_CLIENT_SECRET: z
    .string()
    .optional()
    .transform((value) => (value ? value : undefined)),
  // GitHub 저장소에 이슈를 생성할 권한만 가진 fine-grained PAT. 미설정 시 피드백 API만 503으로
  // 비활성화되고 나머지는 정상 동작한다. (Settings > Developer settings > Fine-grained tokens,
  // 이 repo만 선택하고 Issues: Read and write 권한만 부여)
  GITHUB_FEEDBACK_TOKEN: z
    .string()
    .optional()
    .transform((value) => (value ? value : undefined)),
  // 대회 사무국이 제공한 OGQ 마켓 API 키. 미설정 시 OGQ 연동 기능만 503으로 비활성화되고
  // 나머지는 정상 동작한다. 절대 프론트엔드로 내려보내지 않는다(서버 사이드 프록시 전용).
  OGQ_API_KEY: z.string().min(1).optional(),
  OGQ_API_BASE_URL: z.string().url().default('https://4th-ai-ogq.competition.ogq.me'),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  GROQ_API_KEY: z.string().min(1).optional(),
  // llama-3.3-70b-versatile은 2026-08-16부로 Groq에서 폐기(무료/개발자 티어).
  // Groq 공식 마이그레이션 권장 모델로 교체. (https://console.groq.com/docs/deprecations)
  GROQ_MODEL: z.string().default('qwen/qwen3.8-27b'),
  GROQ_BASE_URL: z.string().url().default('https://api.groq.com/openai/v1'),
  TRANSLATION_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
  TRANSLATION_PROVIDER: z.enum(['groq', 'openai']).default('groq'),
  // TRANSLATION_PROVIDER=openai일 때 사용(OPENAI_API_KEY 필요, GROQ_API_KEY가 있으면 실패 시 fallback).
  // 번역 벤치마크(73캡션 중 25개, judge gpt-5.6): baseline Groq 3.74 → gpt-5.6 4.88 / luna 4.79.
  OPENAI_TRANSLATION_MODEL: z.string().default('gpt-5.6'),
  OPENAI_TRANSLATION_REASONING_EFFORT: z.enum(['none', 'low', 'medium', 'high']).default('low'),
  OPENAI_TRANSLATION_TIMEOUT_MS: z.coerce.number().int().positive().default(60_000),

  OCR_PROVIDER: z.enum(['paddle', 'openvino-npu', 'luna']).default('paddle'),
  OCR_SHADOW_PROVIDER: z.enum(['none', 'openvino-npu']).default('none'),
  OCR_SHADOW_MAX_VARIANTS: z.coerce.number().int().min(1).max(3).default(2),
  OCR_PYTHON_EXECUTABLE: z.string().default('python3'),
  OCR_WINDOWS_PYTHON: z.string().default('py'),
  OCR_TIMEOUT_MS: z.coerce.number().int().positive().default(90_000),
  OCR_IMAGE_MAX_DIMENSION: z.coerce.number().int().min(512).max(4096).default(1280),
  // OCR_PROVIDER=luna일 때 사용하는 OCR 주력 엔진. 벤치마크(2026-08-24)에서 PaddleOCR(평균
  // IoU 0.637) 대비 GPT-5.6 Luna(0.914)가 정확도·안정성·비용 모두 우위였다. PaddleOCR는
  // Luna 호출이 실패하거나 한글을 전혀 찾지 못했을 때의 fallback으로 유지한다.
  OPENAI_API_KEY: z.string().min(1).optional(),
  ENABLE_IMAGE_GENERATION: z.string().default('false').transform((v) => v === 'true'),
  IMAGE_GENERATION_OWNER_EMAIL: z.string().email().default('yunjae14278@naver.com'),
  IMAGE_GENERATION_BUDGET_USD: z.coerce.number().positive().max(10).default(8),
  IMAGE_GENERATION_RESERVE_USD: z.coerce.number().positive().default(2),
  OPENAI_OCR_MODEL: z.string().default('gpt-5.6-luna'),
  OPENAI_BASE_URL: z.string().url().default('https://api.openai.com/v1'),
  GEMINI_API_KEY: z.string().min(1).optional(),
  GEMINI_VISION_MODEL: z.string().default('gemini-2.5-flash'),
  VISION_PROVIDER: z.enum(['groq', 'gemini']).default('groq'),
  GROQ_VISION_MODEL: z.string().default('qwen/qwen3.8-27b'),
  VISION_TIMEOUT_MS: z.coerce.number().int().positive().default(25_000),
  // 원본 글자 이미지를 분석해 번역 폰트를 원본과 비슷하게 고르는 기능. 번역과 병렬로 도는
  // 별도 Vision 호출이 하나 더 붙는 거라, 문제가 생기면 재배포 없이 바로 끌 수 있게 플래그로 뺐다.
  ENABLE_FONT_STYLE_ANALYSIS: z.string().default('true').transform((v) => v === 'true'),

  // 정리한 영역을 OCR로 다시 읽어 글자가 남았는지 확인한다("성공"으로 기록됐는데 글자가 남는 부분 정리를 잡는다).
  // 검증 호출이 실패하면 통과로 취급한다(검증 때문에 정리 자체가 실패하면 안 된다).
  ENABLE_CLEANUP_VERIFICATION: z.string().default('true').transform((v) => v === 'true'),
  CLEANUP_VERIFICATION_TIMEOUT_MS: z.coerce.number().int().positive().default(45_000),
  // 검증에서 글자가 남은 영역만 이미지 편집 API로 지운다. 유료라 기본은 끈다.
  ENABLE_CLEANUP_AI_FALLBACK: z.string().default('false').transform((v) => v === 'true'),
  CLEANUP_AI_MODEL: z.string().default('gpt-image-2.5-sunburst'),
  CLEANUP_AI_TIMEOUT_MS: z.coerce.number().int().positive().default(90_000),
  CLEANUP_AI_MAX_PER_HOUR: z.coerce.number().int().min(0).default(30),

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
