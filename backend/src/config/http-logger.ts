import type { Logger } from 'pino';
import type { Options } from 'pino-http';
import type express from 'express';
import { safeLogError } from '../utils/log-error.js';

const REDACTED = '[REDACTED]';

/** 주소에 실린 비밀값(메일 링크의 ?token=)을 가린다. 나머지 쿼리는 디버깅에 쓰도록 남긴다. */
export function redactUrl(url: string): string {
  return url.replace(/([?&]token=)[^&#]*/gi, `$1${REDACTED}`);
}

/**
 * 요청 로그 설정. 로그인·프로젝트 토큰 헤더와 쿠키, 그리고 주소·쿼리에 실린 링크 토큰을 남기지 않는다.
 * 링크 토큰이 로그에 남으면 로그를 볼 수 있는 사람이 24시간 동안 남의 데이터를 받을 수 있다.
 */
export function httpLoggerOptions(logger: Logger): Options {
  return {
    logger,
    serializers: {
      err: safeLogError,
      req: (req: { url?: string; query?: Record<string, unknown> }) => {
        if (typeof req.url === 'string') req.url = redactUrl(req.url);
        if (req.query && typeof req.query === 'object' && 'token' in req.query) req.query = { ...req.query, token: REDACTED };
        return req;
      },
    },
    redact: {
      paths: ['req.headers.x-project-token', 'req.headers.authorization', 'req.headers.x-admin-key', 'req.headers.cookie', 'res.headers.set-cookie'],
      censor: REDACTED,
    },
    genReqId: (req) => (req as express.Request).id,
    customLogLevel: (_req, res, err) => {
      if (err || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
  };
}
