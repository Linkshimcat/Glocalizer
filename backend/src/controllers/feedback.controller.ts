import type { Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { submitFeedback } from '../services/feedback.service.js';

export async function submitFeedbackHandler(req: Request, res: Response) {
  const result = await submitFeedback(requireAuth(req).sub, req.body);
  res.status(201).json(result);
}
