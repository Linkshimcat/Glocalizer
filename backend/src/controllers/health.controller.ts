import type { Request, Response } from 'express';
import { checkServiceDependencies } from '../repositories/health.repository.js';
import type { ReadinessResponse } from '../types/health.js';

export async function getReadinessHandler(_req: Request, res: Response): Promise<void> {
  const dependencies = await checkServiceDependencies();
  const ready = dependencies.database && dependencies.storage;
  const body: ReadinessResponse = {
    status: ready ? 'ready' : 'unavailable',
    dependencies,
    timestamp: new Date().toISOString(),
  };
  res.status(ready ? 200 : 503).json(body);
}
