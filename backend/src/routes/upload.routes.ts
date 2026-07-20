import { Router } from 'express';
import { completeUploadsHandler } from '../controllers/upload.controller.js';
import { projectAuthMiddleware } from '../middleware/project-auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { completeUploadsSchema, projectParamsSchema } from '../schemas/upload.schema.js';
import { asyncHandler } from '../utils/async-handler.js';

export const uploadRouter = Router();

uploadRouter.post(
  '/projects/:projectId/uploads/complete',
  validate(projectParamsSchema, 'params'),
  projectAuthMiddleware,
  validate(completeUploadsSchema, 'body'),
  asyncHandler(completeUploadsHandler),
);
