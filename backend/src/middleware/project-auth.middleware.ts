import type { NextFunction, Request, Response } from 'express';
import { verifyAuthToken } from '../utils/jwt.js';
import { findUserById } from '../repositories/user.repository.js';
import { AppError } from '../errors/app-error.js';
import { findProjectById } from '../repositories/project.repository.js';
import type { ProjectRow } from '../types/project.js';
import { requireParam } from '../utils/request-params.js';
import { verifyProjectToken } from '../utils/hash.js';

const PROJECT_TOKEN_HEADER = 'x-project-token';

export async function projectAuthMiddleware(req: Request, _res: Response, next: NextFunction) {
  try {
    const projectId = requireParam(req, 'projectId');
    const token = req.header(PROJECT_TOKEN_HEADER);
    if (!token && !req.header('authorization')) throw new AppError('INVALID_PROJECT_TOKEN');

    const project = await findProjectById(projectId);
    if (!project) {
      throw new AppError('PROJECT_NOT_FOUND', { projectId });
    }
    if (project.status === 'expired' || (project.expires_at && new Date(project.expires_at).getTime() < Date.now())) {
      throw new AppError('PROJECT_NOT_FOUND', { projectId }, '만료된 프로젝트입니다.');
    }
    if (project.owner_id) {
      const header = req.header('authorization');
      const payload = header?.startsWith('Bearer ') ? verifyAuthToken(header.slice(7)) : null;
      if (!payload || !await findUserById(payload.sub)) throw new AppError('UNAUTHORIZED');
      if (payload.sub !== project.owner_id) throw new AppError('PROJECT_NOT_FOUND', { projectId });
      req.auth = { sub: payload.sub };
    } else if (!token || !verifyProjectToken(token, project.access_token_hash)) {
      throw new AppError('INVALID_PROJECT_TOKEN', { projectId });
    }

    req.project = project;
    next();
  } catch (err) {
    next(err);
  }
}

/** projectAuthMiddleware를 거친 라우트의 컨트롤러에서 req.project!를 반복하는 대신 쓴다. */
export function requireProject(req: Request): ProjectRow {
  if (!req.project) {
    throw new AppError('INVALID_PROJECT_TOKEN', undefined, '프로젝트 인증이 필요합니다.');
  }
  return req.project;
}
