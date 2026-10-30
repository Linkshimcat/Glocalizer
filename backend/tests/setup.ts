import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// 테스트 중에는 pino 로그가 매 요청마다 콘솔을 채우는 걸 막는다.
process.env.LOG_LEVEL = 'silent';
process.env.SUPABASE_URL ??= 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY ??= 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key';
process.env.PROJECT_TOKEN_SECRET ??= 'test-project-token-secret';
process.env.DOWNLOAD_STATS_API_KEY ??= 'test-download-stats-api-key';
process.env.JWT_SECRET ??= 'test-jwt-secret-for-vitest';
process.env.OPENAI_API_KEY ??= 'test-openai-key';

// Each suite tests its own behavior without sharing authentication limiter counters.
process.env.AUTH_RATE_LIMIT_MAX_REQUESTS ??= '1000';
process.env.PASSWORD_RATE_LIMIT_MAX_REQUESTS ??= '1000';

// OpenCV(cv2)를 쓰는 테스트(directional-inpaint)는 백엔드 가상환경의 Python이 필요하다. 로컬 .env 설정과 상관없이
// backend/.venv가 있으면 그걸 쓰고, 없으면(CI 등) 시스템 python3로 둔다.
const venvPython = fileURLToPath(new URL('../.venv/bin/python', import.meta.url));
if (existsSync(venvPython)) process.env.OCR_PYTHON_EXECUTABLE ??= venvPython;
