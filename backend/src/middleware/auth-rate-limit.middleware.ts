import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { ERROR_CODES } from '../errors/error-codes.js';
const shared = {
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS, standardHeaders: true, legacyHeaders: false,
  handler: (req: import('express').Request, res: import('express').Response) => res.status(429).json({ error: { code: 'RATE_LIMITED', message: ERROR_CODES.RATE_LIMITED.message, requestId: req.id } }),
};
export const authEntryRateLimit = rateLimit({ ...shared, limit: env.AUTH_RATE_LIMIT_MAX_REQUESTS });
export const passwordRateLimit = rateLimit({ ...shared, limit: env.PASSWORD_RATE_LIMIT_MAX_REQUESTS, keyGenerator: req => req.auth!.sub });
