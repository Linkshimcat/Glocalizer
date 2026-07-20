import type { Request, Response } from 'express';
import { createProject } from '../services/project.service.js';

export async function createProjectHandler(req: Request, res: Response) {
  const result = await createProject(req.body);
  res.status(201).json(result);
}
