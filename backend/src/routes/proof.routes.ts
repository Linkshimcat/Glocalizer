import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import { notImplementedHandler } from '../utils/not-implemented.js';

export const proofRouter = Router();

// 집계(기본 external만)와 원자료. 공개 여부(관리자 키 필요 여부)는 구현 시 결정한다.
proofRouter.get('/proof/summary', asyncHandler(notImplementedHandler));
proofRouter.get('/proof/export.csv', asyncHandler(notImplementedHandler));
