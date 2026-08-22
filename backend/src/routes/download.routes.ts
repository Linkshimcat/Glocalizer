import { Router } from 'express';
import { getDownloadStatsHandler, recordDownloadHandler } from '../controllers/download.controller.js';
import { projectAuthMiddleware } from '../middleware/project-auth.middleware.js';
import { statsAuthMiddleware } from '../middleware/stats-auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { recordDownloadSchema } from '../schemas/download.schema.js';
import { projectParamsSchema } from '../schemas/upload.schema.js';
import { asyncHandler } from '../utils/async-handler.js';

export const downloadRouter = Router();

downloadRouter.post(
  '/projects/:projectId/downloads',
  validate(projectParamsSchema, 'params'),
  projectAuthMiddleware,
  validate(recordDownloadSchema, 'body'),
  asyncHandler(recordDownloadHandler),
);

// 집계 통계는 개별 프로젝트 토큰이 아니라 관리자 키(X-Admin-Key)로 보호한다.
downloadRouter.get('/downloads/count', statsAuthMiddleware, asyncHandler(getDownloadStatsHandler));
