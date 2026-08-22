import { Router } from 'express';
import { getDownloadStatsHandler, recordDownloadHandler } from '../controllers/download.controller.js';
import { projectAuthMiddleware } from '../middleware/project-auth.middleware.js';
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

// PoC 범위: 집계 숫자만 노출하는 전역 엔드포인트라 인증 없음.
// 운영 배포 전에는 접근 제어를 추가해야 한다.
downloadRouter.get('/downloads/count', asyncHandler(getDownloadStatsHandler));
