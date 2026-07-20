import { Router } from 'express';
import { createProjectHandler } from '../controllers/project.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { createProjectSchema } from '../schemas/project.schema.js';
import { asyncHandler } from '../utils/async-handler.js';

export const projectRouter = Router();

projectRouter.post('/projects', validate(createProjectSchema), asyncHandler(createProjectHandler));
