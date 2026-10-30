import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { ERROR_CODES } from '../errors/error-codes.js';
const shared = {
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS, standardHeaders: true, legacyHeaders: false,
  handler: (req: import('express').Request, res: import('express').Response) => res.status(429).json({ error: { code: 'RATE_LIMITED', message: ERROR_CODES.RATE_LIMITED.message, requestId: req.id } }),
};
export const authEntryRateLimit = rateLimit({ ...shared, limit: env.AUTH_RATE_LIMIT_MAX_REQUESTS });
export const passwordRateLimit = rateLimit({ ...shared, limit: env.PASSWORD_RATE_LIMIT_MAX_REQUESTS, keyGenerator: req => req.auth!.sub });
// 인증코드 메일은 시간당 횟수로 묶는다. 위 비밀번호 제한과 키를 나눠, 코드를 여러 번 받아도 확인 시도 횟수가 줄지 않는다.
export const verificationCodeRateLimit = rateLimit({ ...shared, windowMs: 60 * 60 * 1000, limit: env.VERIFICATION_CODE_MAX_PER_HOUR, keyGenerator: req => `verify:${req.auth!.sub}` });
