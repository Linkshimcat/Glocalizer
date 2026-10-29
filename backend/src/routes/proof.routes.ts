import { Router } from 'express';
import { proofCsvHandler, proofSummaryHandler } from '../controllers/analytics.controller.js';
import { statsAuthMiddleware } from '../middleware/stats-auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { proofQuerySchema } from '../schemas/analytics.schema.js';
import { asyncHandler } from '../utils/async-handler.js';

export const proofRouter = Router();

// 공개 범위가 정해지기 전까지는 다운로드 집계와 같은 관리자 키(X-Admin-Key)로 막아 둔다.
proofRouter.get('/proof/summary', statsAuthMiddleware, validate(proofQuerySchema, 'query'), asyncHandler(proofSummaryHandler));
proofRouter.get('/proof/export.csv', statsAuthMiddleware, validate(proofQuerySchema, 'query'), asyncHandler(proofCsvHandler));
