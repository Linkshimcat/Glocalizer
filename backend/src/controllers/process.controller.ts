import type { Request, Response } from 'express';
import { requireProject } from '../middleware/project-auth.middleware.js';
import { createProcessingJob, getProjectStatus } from '../services/processing.service.js';
import { retryFailedAsset } from '../services/asset-retry.service.js';
import { requireParam } from '../utils/request-params.js';
import { processClaimedJob } from '../workers/job-runner.js';

export async function startProcessingHandler(req: Request, res: Response) {
  const result = await createProcessingJob(requireProject(req).id);
  res.status(202).json({ jobId: result.jobId, status: result.status });
  void processClaimedJob(result.job);
}

export async function getStatusHandler(req: Request, res: Response) {
  const result = await getProjectStatus(requireProject(req).id);
  res.json(result);
}

export async function retryAssetHandler(req: Request, res: Response) {
  const result = await retryFailedAsset(requireProject(req).id, requireParam(req, 'assetId'));
  res.status(202).json({ jobId: result.jobId, status: result.status });
  void processClaimedJob(result.job);
}
