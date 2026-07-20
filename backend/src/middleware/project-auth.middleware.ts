import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/app-error.js';
import { findProjectById } from '../repositories/project.repository.js';
import { hashProjectToken } from '../utils/hash.js';

const PROJECT_TOKEN_HEADER = 'x-project-token';

export async function projectAuthMiddleware(req: Request, _res: Response, next: NextFunction) {
  try {
    const projectId = req.params.projectId as string | undefined;
    const token = req.header(PROJECT_TOKEN_HEADER);

    if (!projectId) {
      throw new AppError('INVALID_REQUEST', undefined, 'projectId가 필요합니다.');
    }
    if (!token) {
      throw new AppError('INVALID_PROJECT_TOKEN', undefined, 'X-Project-Token 헤더가 필요합니다.');
    }

    const project = await findProjectById(projectId);
    if (!project) {
      throw new AppError('PROJECT_NOT_FOUND', { projectId });
    }
    if (project.status === 'expired' || new Date(project.expires_at).getTime() < Date.now()) {
      throw new AppError('PROJECT_NOT_FOUND', { projectId }, '만료된 프로젝트입니다.');
    }
    if (hashProjectToken(token) !== project.access_token_hash) {
      throw new AppError('INVALID_PROJECT_TOKEN', { projectId });
    }

    req.project = project;
    next();
  } catch (err) {
    next(err);
  }
}
