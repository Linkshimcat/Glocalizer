import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/app-error.js';
import { ERROR_CODES } from '../errors/error-codes.js';

export function notFoundHandler(req: Request, res: Response) {
  res.status(ERROR_CODES.NOT_FOUND.status).json({
    error: {
      code: 'NOT_FOUND',
      message: ERROR_CODES.NOT_FOUND.message,
      requestId: req.id,
      details: { path: req.originalUrl },
    },
  });
}

// Express는 err 핸들러를 인자 개수(4개)로 구분하므로 _next를 실제로 쓰지 않아도 시그니처에 남겨둔다.
export function errorMiddleware(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      req.log?.error({ err, code: err.code }, err.message);
    } else {
      req.log?.warn({ code: err.code, details: err.details }, err.message);
    }
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        requestId: req.id,
        ...(err.details ? { details: err.details } : {}),
      },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(ERROR_CODES.INVALID_REQUEST.status).json({
      error: {
        code: 'INVALID_REQUEST',
        message: ERROR_CODES.INVALID_REQUEST.message,
        requestId: req.id,
        details: { issues: err.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })) },
      },
    });
    return;
  }

  req.log?.error({ err }, 'Unhandled error');
  res.status(ERROR_CODES.INTERNAL_ERROR.status).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: ERROR_CODES.INTERNAL_ERROR.message,
      requestId: req.id,
    },
  });
}
