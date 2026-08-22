import type { Request, Response } from 'express';
import { requireProject } from '../middleware/project-auth.middleware.js';
import { getDownloadStats, recordDownload } from '../services/download.service.js';

export async function recordDownloadHandler(req: Request, res: Response) {
  const { kind, languageCode } = req.body;
  await recordDownload(requireProject(req).id, kind, languageCode);
  res.status(204).send();
}

export async function getDownloadStatsHandler(_req: Request, res: Response) {
  const stats = await getDownloadStats();
  res.json(stats);
}
