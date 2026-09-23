import type { Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import type { DeepReviewRequest } from '../schemas/deep-review.schema.js';
import { createDeepReview } from '../services/deep-review.service.js';

export async function createDeepReviewHandler(req: Request, res: Response) {
  res.json(await createDeepReview(req.body as DeepReviewRequest, requireAuth(req).sub));
}
