import type { Request, Response } from 'express';
import { listLandingShowcases } from '../services/showcase.service.js';

export async function getLandingShowcasesHandler(_req: Request, res: Response) {
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
  res.json({ showcases: await listLandingShowcases() });
}
