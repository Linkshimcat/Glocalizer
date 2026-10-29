import { Router } from 'express';
import { updatePersonaHandler } from '../controllers/persona.controller.js';
import { projectAuthMiddleware } from '../middleware/project-auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { updatePersonaSchema } from '../schemas/persona.schema.js';
import { projectParamsSchema } from '../schemas/upload.schema.js';
import { asyncHandler } from '../utils/async-handler.js';

export const personaRouter = Router();

personaRouter.put(
  '/projects/:projectId/persona',
  validate(projectParamsSchema, 'params'),
  projectAuthMiddleware,
  validate(updatePersonaSchema, 'body'),
  asyncHandler(updatePersonaHandler),
);
