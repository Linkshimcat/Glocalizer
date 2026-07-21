import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { ERROR_CODES } from '../errors/error-codes.js';

export const rateLimitMiddleware = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
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
