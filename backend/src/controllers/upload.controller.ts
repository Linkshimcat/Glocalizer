import type { Request, Response } from 'express';
import { requireProject } from '../middleware/project-auth.middleware.js';
import { completeUploads } from '../services/upload.service.js';

export async function completeUploadsHandler(req: Request, res: Response) {
  const { assetIds } = req.body as { assetIds: string[] };
  const results = await completeUploads(requireProject(req).id, assetIds);
  res.json({ assets: results });
}
