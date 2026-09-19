import { Router } from 'express';
import { submitFeedbackHandler } from '../controllers/feedback.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { feedbackSchema } from '../schemas/feedback.schema.js';
import { asyncHandler } from '../utils/async-handler.js';

export const feedbackRouter = Router();

feedbackRouter.post('/feedback', authMiddleware, validate(feedbackSchema), asyncHandler(submitFeedbackHandler));
