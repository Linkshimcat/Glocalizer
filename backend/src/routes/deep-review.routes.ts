import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { createDeepReviewHandler } from '../controllers/deep-review.controller.js';
import { ERROR_CODES } from '../errors/error-codes.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { deepReviewRequestSchema } from '../schemas/deep-review.schema.js';
import { asyncHandler } from '../utils/async-handler.js';

export const deepReviewRouter = Router();

const deepReviewRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: env.AI_REVIEW_MAX_PER_HOUR,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => req.auth?.sub ?? 'anonymous',
  handler: (req, res) => {
    res.status(ERROR_CODES.RATE_LIMITED.status).json({
      error: { code: 'RATE_LIMITED', message: ERROR_CODES.RATE_LIMITED.message, requestId: req.id },
    });
  },
});

deepReviewRouter.post('/review/deep-feedback', authMiddleware, deepReviewRateLimit, validate(deepReviewRequestSchema), asyncHandler(createDeepReviewHandler));
