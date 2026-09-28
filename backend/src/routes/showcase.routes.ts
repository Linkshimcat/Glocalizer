import { Router } from 'express';
import { getLandingShowcasesHandler } from '../controllers/showcase.controller.js';
import { asyncHandler } from '../utils/async-handler.js';

export const showcaseRouter = Router();

showcaseRouter.get('/landing/showcases', asyncHandler(getLandingShowcasesHandler));
