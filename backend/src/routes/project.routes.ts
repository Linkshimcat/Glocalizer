import { authMiddleware } from '../middleware/auth.middleware.js';
import { Router } from 'express';
import { createProjectHandler, deleteProjectHandler, createDraftHandler, updateDraftHandler, listWorkspacesHandler, restoreWorkspaceHandler, finishWorkspaceHandler } from '../controllers/project.controller.js';
import { projectAuthMiddleware } from '../middleware/project-auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { createProjectSchema, draftProjectSchema } from '../schemas/project.schema.js';
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

projectRouter.get('/projects', authMiddleware, asyncHandler(listWorkspacesHandler));
projectRouter.post('/projects/drafts', authMiddleware, validate(draftProjectSchema), asyncHandler(createDraftHandler));
projectRouter.put('/projects/:projectId/draft', authMiddleware, validate(projectParamsSchema, 'params'), projectAuthMiddleware, validate(draftProjectSchema), asyncHandler(updateDraftHandler));
projectRouter.get('/projects/:projectId/workspace', authMiddleware, validate(projectParamsSchema, 'params'), projectAuthMiddleware, asyncHandler(restoreWorkspaceHandler));
projectRouter.post('/projects/:projectId/finish', authMiddleware, validate(projectParamsSchema, 'params'), projectAuthMiddleware, asyncHandler(finishWorkspaceHandler));
