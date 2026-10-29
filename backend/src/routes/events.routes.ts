import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import { notImplementedHandler } from '../utils/not-implemented.js';

export const eventsRouter = Router();

// 비로그인 허용 이벤트 수집. 구현 시 rate limit과 clientEventId 중복 제거를 붙인다.
eventsRouter.post('/events', asyncHandler(notImplementedHandler));
