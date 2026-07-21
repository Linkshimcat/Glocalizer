import type { Request, Response } from 'express';
import { requireProject } from '../middleware/project-auth.middleware.js';
import { getProjectResults } from '../services/result.service.js';

export async function getResultsHandler(req: Request, res: Response) {
  const result = await getProjectResults(requireProject(req).id);
  res.json(result);
}
