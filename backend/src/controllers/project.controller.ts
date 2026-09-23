import { findUserById } from '../repositories/user.repository.js';
import { AppError } from '../errors/app-error.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { markProjectResultReady, renameProject } from '../repositories/project.repository.js';
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

/** 빈 문자열이면 null로 저장해 기존 규칙(첫 파일명)으로 되돌아가게 한다. */
export async function renameProjectHandler(req: Request, res: Response) {
  const name = String(req.body?.name ?? '').trim().slice(0, 60);
  await renameProject(requireProject(req).id, name || null);
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
