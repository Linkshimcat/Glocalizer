import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { proofCsvHandler, proofSummaryHandler } from '../controllers/analytics.controller.js';
import { ERROR_CODES } from '../errors/error-codes.js';
import { statsAuthMiddleware } from '../middleware/stats-auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { proofQuerySchema } from '../schemas/analytics.schema.js';
import { asyncHandler } from '../utils/async-handler.js';

export const proofRouter = Router();

// 키 없이 열리는 경로는 IP당 따로 제한한다. 집계는 이벤트 전체를 읽으므로 무제한으로 두지 않는다.
const publicSummaryRateLimit = rateLimit({
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

/**
 * 공개 범위: 실사용자(external) 집계만 키 없이 볼 수 있다. 팀원(internal)·데모(demo) 집계와 원자료 CSV는 관리자 키가 필요하다.
 * 키를 보낸 요청은 어느 그룹이든 키를 검증하고(틀리면 거절), 캐시 없이 최신값을 받는다.
 */
function proofSummaryAccess(req: Request, res: Response, next: NextFunction) {
  const { group } = req.query as { group: string };
  if (group !== 'external' || req.header('x-admin-key') !== undefined) return statsAuthMiddleware(req, res, next);
  res.locals.proofPublic = true;
  publicSummaryRateLimit(req, res, next);
}

proofRouter.get('/proof/summary', validate(proofQuerySchema, 'query'), proofSummaryAccess, asyncHandler(proofSummaryHandler));
proofRouter.get('/proof/export.csv', statsAuthMiddleware, validate(proofQuerySchema, 'query'), asyncHandler(proofCsvHandler));
