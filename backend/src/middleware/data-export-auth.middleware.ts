import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/app-error.js';
import { findUserById } from '../repositories/user.repository.js';
import { verifyExportToken } from '../utils/export-token.js';
import { authMiddleware } from './auth.middleware.js';

/**
 * 내 데이터 받기 ZIP은 로그인 토큰 또는 메일 링크의 ?token= 으로 받을 수 있다.
 * 링크 토큰은 발급 때의 session_version과 같아야 하므로, 비밀번호 변경·다른 기기 로그아웃·탈퇴 뒤에는 쓸 수 없다.
 */
export async function dataExportAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = typeof req.query.token === 'string' ? req.query.token : undefined;
  if (!token) return authMiddleware(req, res, next);
  try {
    const payload = verifyExportToken(token);
    if (!payload) throw new AppError('UNAUTHORIZED');
    const user = await findUserById(payload.sub, 'auth');
    if (!user || user.deleting_at || (user.session_version ?? 0) !== payload.ver) throw new AppError('UNAUTHORIZED');
    req.account = user;
    req.auth = { sub: user.id };
    next();
  } catch (err) {
    next(err);
  }
}
