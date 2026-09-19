import { Router } from 'express';
import { getOgqStickersHandler } from '../controllers/ogq.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { ogqStickersQuerySchema } from '../schemas/ogq.schema.js';
import { asyncHandler } from '../utils/async-handler.js';

export const ogqRouter = Router();

// 랜딩 예시 갤러리 + 로컬라이즈 샘플 선택기가 같이 쓰는 공개 엔드포인트. OGQ API 키는
// 서버에서만 쓰고, 응답에는 인증 없이 바로 <img src>로 쓸 수 있는 thumbnailUrl/imageUrl만 내려준다.
ogqRouter.get('/ogq/stickers', validate(ogqStickersQuerySchema, 'query'), asyncHandler(getOgqStickersHandler));
