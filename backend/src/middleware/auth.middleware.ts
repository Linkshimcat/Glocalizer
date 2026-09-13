import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/app-error.js';
import { verifyAuthToken } from '../utils/jwt.js';

const BEARER_PREFIX = 'Bearer ';

export function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.header('authorization');
    const token = header?.startsWith(BEARER_PREFIX) ? header.slice(BEARER_PREFIX.length) : undefined;
    if (!token) {
      throw new AppError('UNAUTHORIZED', undefined, 'Authorization 헤더가 필요합니다.');
    }

    const payload = verifyAuthToken(token);
    if (!payload) {
      throw new AppError('UNAUTHORIZED', undefined, '유효하지 않거나 만료된 토큰입니다.');
    }

    req.auth = { sub: payload.sub };
    next();
  } catch (err) {
    next(err);
  }
}

/** authMiddleware를 거친 라우트의 컨트롤러에서 req.auth!를 반복하는 대신 쓴다. */
export function requireAuth(req: Request): { sub: string } {
  if (!req.auth) {
    throw new AppError('UNAUTHORIZED');
  }
  return req.auth;
}
