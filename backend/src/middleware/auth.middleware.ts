import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/app-error.js';
import { verifyAuthToken } from '../utils/jwt.js';
import { findSessionById, touchSessionIfStale } from '../repositories/session.repository.js';
import { findUserById } from '../repositories/user.repository.js';

export async function authenticateSession(header: string | undefined) {
  const payload = header?.startsWith('Bearer ') ? verifyAuthToken(header.slice(7)) : null;
  if (!payload) throw new AppError('UNAUTHORIZED');
  const user = await findUserById(payload.sub);
  if (!user || user.id !== payload.sub || (user.session_version ?? 0) !== payload.ver) throw new AppError('UNAUTHORIZED');
  // sid가 없는 토큰은 기기별 세션 도입 이전에 발급된 것이라 만료 시각까지 그대로 유효하다.
  if (payload.sid) {
    const session = await findSessionById(payload.sid);
    if (!session || session.user_id !== user.id || session.revoked_at || new Date(session.expires_at).getTime() <= Date.now()) {
      throw new AppError('UNAUTHORIZED');
    }
    await touchSessionIfStale(session);
  }
  return { user, sid: payload.sid };
}

export async function authenticateAccount(header: string | undefined) {
  return (await authenticateSession(header)).user;
}

export async function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  try {
    const { user, sid } = await authenticateSession(req.header('authorization'));
    req.account = user;
    req.sid = sid;
    if (req.account.deleting_at && req.method !== 'DELETE') throw new AppError('UNAUTHORIZED');
    req.auth = { sub: req.account.id };
    next();
  } catch (err) { next(err); }
}

export function requireAuth(req: Request): { sub: string } {
  if (!req.auth) throw new AppError('UNAUTHORIZED');
  return req.auth;
}
