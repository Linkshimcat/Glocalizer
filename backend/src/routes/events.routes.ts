import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { recordEventHandler } from '../controllers/analytics.controller.js';
import { ERROR_CODES } from '../errors/error-codes.js';
import { validate } from '../middleware/validate.middleware.js';
import { analyticsEventSchema } from '../schemas/analytics.schema.js';
import { asyncHandler } from '../utils/async-handler.js';

export const eventsRouter = Router();

// 비로그인으로 열려 있으므로 IP당 따로 제한한다. 한 사용자의 정상 흐름은 분당 몇 건 수준이다.
const eventsRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(ERROR_CODES.RATE_LIMITED.status).json({
      error: { code: 'RATE_LIMITED', message: ERROR_CODES.RATE_LIMITED.message, requestId: req.id },
    });
  },
});

eventsRouter.post('/events', eventsRateLimit, validate(analyticsEventSchema), asyncHandler(recordEventHandler));
