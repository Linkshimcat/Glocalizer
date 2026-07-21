import { Router } from 'express';
import { createProjectHandler, deleteProjectHandler } from '../controllers/project.controller.js';
import { projectAuthMiddleware } from '../middleware/project-auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { createProjectSchema } from '../schemas/project.schema.js';
import { projectParamsSchema } from '../schemas/upload.schema.js';
import { asyncHandler } from '../utils/async-handler.js';

export const projectRouter = Router();

projectRouter.post('/projects', validate(createProjectSchema), asyncHandler(createProjectHandler));

projectRouter.delete(
  '/projects/:projectId',
  validate(projectParamsSchema, 'params'),
  projectAuthMiddleware,
  asyncHandler(deleteProjectHandler),
);
