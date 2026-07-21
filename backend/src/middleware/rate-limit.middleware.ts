import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { ERROR_CODES } from '../errors/error-codes.js';

export const rateLimitMiddleware = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  // 처리 진행 상황 폴링(GET status)은 프론트가 1.5초마다 자동으로 호출하므로 rate limit에서 제외한다.
  skip: (req) => req.method === 'GET' && /\/projects\/[^/]+\/status$/.test(req.path),
  handler: (req, res) => {
    res.status(ERROR_CODES.RATE_LIMITED.status).json({
      error: {
        code: 'RATE_LIMITED',
        message: ERROR_CODES.RATE_LIMITED.message,
        requestId: req.id,
      },
    });
  },
});
