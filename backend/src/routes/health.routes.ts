import { Router } from 'express';
import { getReadinessHandler } from '../controllers/health.controller.js';
import { asyncHandler } from '../utils/async-handler.js';

export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

healthRouter.get('/health/ready', asyncHandler(getReadinessHandler));
