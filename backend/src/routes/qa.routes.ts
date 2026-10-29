import { Router } from 'express';
import { projectAuthMiddleware } from '../middleware/project-auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { projectParamsSchema } from '../schemas/upload.schema.js';
import { asyncHandler } from '../utils/async-handler.js';
import { notImplementedHandler } from '../utils/not-implemented.js';

export const qaRouter = Router();

// 현재 상태로 검사를 실행하고 새 QaReport를 돌려준다.
qaRouter.post(
  '/projects/:projectId/qa/inspect',
  validate(projectParamsSchema, 'params'),
  projectAuthMiddleware,
  asyncHandler(notImplementedHandler),
);

// 최신 리포트와 재검사 이력 요약.
qaRouter.get(
  '/projects/:projectId/qa',
  validate(projectParamsSchema, 'params'),
  projectAuthMiddleware,
  asyncHandler(notImplementedHandler),
);
