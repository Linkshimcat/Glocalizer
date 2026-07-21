import type { Request, Response } from 'express';
import { requireProject } from '../middleware/project-auth.middleware.js';
import { createProject, deleteProjectAndAssets } from '../services/project.service.js';

export async function createProjectHandler(req: Request, res: Response) {
  const result = await createProject(req.body);
  res.status(201).json(result);
}

export async function deleteProjectHandler(req: Request, res: Response) {
  await deleteProjectAndAssets(requireProject(req).id);
  res.status(204).send();
}
