import { findUserById } from '../repositories/user.repository.js';
import { AppError } from '../errors/app-error.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { markProjectResultReady } from '../repositories/project.repository.js';
import { createDraft, updateDraft, listWorkspaces, restoreWorkspace } from '../services/workspace.service.js';
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

export async function createDraftHandler(req: Request, res: Response) {
  const ownerId = requireAuth(req).sub;
  if (!await findUserById(ownerId)) throw new AppError('UNAUTHORIZED');
  res.status(201).json(await createDraft(req.body, ownerId));
}
export async function updateDraftHandler(req: Request, res: Response) {
  res.json(await updateDraft(requireProject(req), req.body));
}
export async function listWorkspacesHandler(req: Request, res: Response) {
  const ownerId = requireAuth(req).sub;
  if (!await findUserById(ownerId)) throw new AppError('UNAUTHORIZED');
  res.json({ projects: await listWorkspaces(ownerId) });
}
export async function restoreWorkspaceHandler(req: Request, res: Response) {
  res.json(await restoreWorkspace(requireProject(req)));
}
export async function finishWorkspaceHandler(req: Request, res: Response) {
  const project = requireProject(req);
  if (!['completed', 'failed'].includes(project.status)) throw new AppError('INVALID_REQUEST', undefined, '처리가 끝난 작업만 완료할 수 있습니다.');
  await markProjectResultReady(project.id);
  res.status(204).send();
}
