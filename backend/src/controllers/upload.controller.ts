import type { Request, Response } from 'express';
import { completeUploads } from '../services/upload.service.js';

export async function completeUploadsHandler(req: Request, res: Response) {
  const { assetIds } = req.body as { assetIds: string[] };
  const results = await completeUploads(req.project!.id, assetIds);
  res.json({ assets: results });
}
