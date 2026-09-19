import type { Request, Response } from 'express';
import { fetchOgqStickers } from '../services/ogq.service.js';

export async function getOgqStickersHandler(req: Request, res: Response) {
  const { limit, query } = req.query as unknown as { limit: number; query?: string };
  res.json({ stickers: await fetchOgqStickers(limit, query) });
}
