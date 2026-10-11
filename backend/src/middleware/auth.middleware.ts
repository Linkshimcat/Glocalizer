import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/app-error.js';
import { verifyAuthToken } from '../utils/jwt.js';
import { findUserById } from '../repositories/user.repository.js';

export async function authenticateAccount(header: string | undefined) {
  const payload = header?.startsWith('Bearer ') ? verifyAuthToken(header.slice(7)) : null;
  if (!payload) throw new AppError('UNAUTHORIZED');
  const user = await findUserById(payload.sub);
  if (!user || user.id !== payload.sub || (user.session_version ?? 0) !== payload.ver) throw new AppError('UNAUTHORIZED');
  return user;
}

export async function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  try {
    req.account = await authenticateAccount(req.header('authorization'));
    if (req.account.deleting_at && req.method !== 'DELETE') throw new AppError('UNAUTHORIZED');
    req.auth = { sub: req.account.id };
    next();
  } catch (err) { next(err); }
}

export function requireAuth(req: Request): { sub: string } {
  if (!req.auth) throw new AppError('UNAUTHORIZED');
  return req.auth;
}
