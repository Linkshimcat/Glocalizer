import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/app-error.js';
import { verifyAuthToken } from '../utils/jwt.js';
import { findSessionById, touchSessionIfStale } from '../repositories/session.repository.js';
import { findUserById } from '../repositories/user.repository.js';

export async function authenticateSession(header: string | undefined) {
  const payload = header?.startsWith('Bearer ') ? verifyAuthToken(header.slice(7)) : null;
  if (!payload) throw new AppError('UNAUTHORIZED');
  // 두 조회는 서로 의존하지 않아 DB 왕복을 한 번으로 합친다.
  const [user, session] = await Promise.all([
    findUserById(payload.sub),
    payload.sid ? findSessionById(payload.sid) : Promise.resolve(null),
  ]);
  if (!user || user.id !== payload.sub || (user.session_version ?? 0) !== payload.ver) throw new AppError('UNAUTHORIZED');
  // sid가 없는 토큰은 기기별 세션 도입 이전에 발급된 것이라 만료 시각까지 그대로 유효하다.
  if (payload.sid) {
    if (!session || session.user_id !== user.id || session.revoked_at || new Date(session.expires_at).getTime() <= Date.now()) {
      throw new AppError('UNAUTHORIZED');
    }
    // 응답에 영향이 없는 갱신이라 기다리지 않는다. 실패해도 요청을 막지 않는다.
    void (async () => {
      try { await touchSessionIfStale(session); } catch { /* 다음 요청에서 다시 시도한다 */ }
    })();
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
