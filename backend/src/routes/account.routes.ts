import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { accountSummaryHandler, emailAccountExportHandler, exportAccountDataHandler, exportAccountZipHandler, loginHistoryHandler } from '../controllers/account.controller.js';
import { ERROR_CODES } from '../errors/error-codes.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { dataExportAuthMiddleware } from '../middleware/data-export-auth.middleware.js';
import { asyncHandler } from '../utils/async-handler.js';

export const accountRouter = Router();

// 계정의 모든 이미지를 읽는 무거운 요청이라 사용자마다 시간당 횟수를 묶는다.
const perUserHourly = (limit: number, prefix: string) => rateLimit({
  windowMs: 60 * 60 * 1000,
  limit,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => `${prefix}:${req.auth?.sub ?? 'anonymous'}`,
  handler: (req, res) => {
    res.status(ERROR_CODES.RATE_LIMITED.status).json({ error: { code: 'RATE_LIMITED', message: ERROR_CODES.RATE_LIMITED.message, requestId: req.id } });
  },
});

accountRouter.get('/auth/me/summary', authMiddleware, asyncHandler(accountSummaryHandler));
accountRouter.get('/auth/me/export', authMiddleware, asyncHandler(exportAccountDataHandler));
// 프로필·프로젝트 이미지·번역까지 담은 ZIP. 로그인 토큰 또는 메일 링크(?token=)로 받는다.
accountRouter.get('/auth/me/export.zip', dataExportAuthMiddleware, perUserHourly(env.DATA_EXPORT_MAX_PER_HOUR, 'export-zip'), asyncHandler(exportAccountZipHandler));
accountRouter.post('/auth/me/export/email', authMiddleware, perUserHourly(env.DATA_EXPORT_EMAIL_MAX_PER_HOUR, 'export-email'), asyncHandler(emailAccountExportHandler));
accountRouter.get('/auth/login-history', authMiddleware, asyncHandler(loginHistoryHandler));
