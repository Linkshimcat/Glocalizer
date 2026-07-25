import { Router } from 'express';
import { getStatusHandler, retryAssetHandler, startProcessingHandler } from '../controllers/process.controller.js';
import { projectAuthMiddleware } from '../middleware/project-auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { assetParamsSchema } from '../schemas/editor-state.schema.js';
import { projectParamsSchema } from '../schemas/upload.schema.js';
import { asyncHandler } from '../utils/async-handler.js';

export const processRouter = Router();

processRouter.post(
  '/projects/:projectId/process',
  validate(projectParamsSchema, 'params'),
  projectAuthMiddleware,
  asyncHandler(startProcessingHandler),
);

processRouter.get(
  '/projects/:projectId/status',
  validate(projectParamsSchema, 'params'),
  projectAuthMiddleware,
  asyncHandler(getStatusHandler),
);

processRouter.post(
  '/projects/:projectId/assets/:assetId/retry',
  validate(assetParamsSchema, 'params'),
  projectAuthMiddleware,
  asyncHandler(retryAssetHandler),
);
