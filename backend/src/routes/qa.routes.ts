import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { env } from '../config/env.js';
import { getQaHandler, inspectQaHandler } from '../controllers/qa.controller.js';
import { AppError } from '../errors/app-error.js';
import { ERROR_CODES } from '../errors/error-codes.js';
import { projectAuthMiddleware } from '../middleware/project-auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { inspectQaBodySchema } from '../schemas/qa.schema.js';
import { projectParamsSchema } from '../schemas/upload.schema.js';
import { asyncHandler } from '../utils/async-handler.js';

export const qaRouter = Router();

// 브라우저가 내보낸 최종 PNG를 이미지마다 한 파트씩(필드 이름 = assetId) 받는다. 1 MB 초과도 fail로 판정해야 하므로
// 파일 한도는 규격보다 넉넉하게 두고, 메모리에서만 읽고 저장하지 않는다.
const exportedPngUpload = multer({
  storage: multer.memoryStorage(),
  limits: { files: env.MAX_FILES_PER_PROJECT, fileSize: 5 * 1024 * 1024, fields: 5, fieldSize: 1024 },
}).any();

function receiveExportedPngs(req: Request, res: Response, next: NextFunction) {
  exportedPngUpload(req, res, (err: unknown) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      return next(err.code === 'LIMIT_FILE_SIZE'
        ? new AppError('FILE_TOO_LARGE', { field: err.field }, '검사할 이미지는 한 장에 5 MB까지 보낼 수 있습니다.')
        : new AppError('INVALID_REQUEST', { reason: err.code }, '검사 요청 형식이 올바르지 않습니다.'));
    }
    next(err);
  });
}

// 이미지 24장을 디코딩하는 무거운 요청이라 프로젝트마다 따로 제한한다.
const inspectRateLimit = rateLimit({
  windowMs: 10 * 60_000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => `qa:${req.params.projectId}`,
  handler: (req, res) => {
    res.status(ERROR_CODES.RATE_LIMITED.status).json({
      error: { code: 'RATE_LIMITED', message: ERROR_CODES.RATE_LIMITED.message, requestId: req.id },
    });
  },
});

// 현재 상태와 내보낸 PNG로 검사를 실행하고 새 QaReport를 돌려준다. 인증을 먼저 통과해야 파일을 읽는다.
qaRouter.post(
  '/projects/:projectId/qa/inspect',
  validate(projectParamsSchema, 'params'),
  projectAuthMiddleware,
  inspectRateLimit,
  receiveExportedPngs,
  validate(inspectQaBodySchema, 'body'),
  asyncHandler(inspectQaHandler),
);

// 최신 리포트와 재검사 이력 요약.
qaRouter.get(
  '/projects/:projectId/qa',
  validate(projectParamsSchema, 'params'),
  projectAuthMiddleware,
  asyncHandler(getQaHandler),
);
