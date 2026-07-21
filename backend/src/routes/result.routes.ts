import { Router } from 'express';
import { getResultsHandler } from '../controllers/result.controller.js';
import { projectAuthMiddleware } from '../middleware/project-auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { projectParamsSchema } from '../schemas/upload.schema.js';
import { asyncHandler } from '../utils/async-handler.js';

export const resultRouter = Router();

resultRouter.get(
  '/projects/:projectId/results',
  validate(projectParamsSchema, 'params'),
  projectAuthMiddleware,
  asyncHandler(getResultsHandler),
);
