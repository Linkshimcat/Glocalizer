import { z } from 'zod';

// multipart면 파일 외 필드, JSON이면 본문. assetId를 주면 그 이미지 기준으로 passed를 계산한다(에디터 재검사).
export const inspectQaBodySchema = z.object({
  assetId: z.string().uuid().optional(),
}).strict();
