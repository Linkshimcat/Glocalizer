import { Router } from 'express';
import { accountSummaryHandler, exportAccountDataHandler, loginHistoryHandler } from '../controllers/account.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/async-handler.js';

export const accountRouter = Router();

accountRouter.get('/auth/me/summary', authMiddleware, asyncHandler(accountSummaryHandler));
accountRouter.get('/auth/me/export', authMiddleware, asyncHandler(exportAccountDataHandler));
accountRouter.get('/auth/login-history', authMiddleware, asyncHandler(loginHistoryHandler));
