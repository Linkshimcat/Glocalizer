import { timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';
import { AppError } from '../errors/app-error.js';

const STATS_KEY_HEADER = 'x-admin-key';

/** 프로젝트 토큰과 무관한 전역 통계(GET /downloads/count)를 관리자 키로 보호한다. */
export function statsAuthMiddleware(req: Request, _res: Response, next: NextFunction) {
  const provided = req.header(STATS_KEY_HEADER);
  if (!provided || !isValidKey(provided)) {
    return next(new AppError('INVALID_STATS_KEY', undefined, 'X-Admin-Key 헤더가 필요합니다.'));
  }
  next();
}

function isValidKey(provided: string): boolean {
  const actual = Buffer.from(provided);
  const expected = Buffer.from(env.DOWNLOAD_STATS_API_KEY);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
