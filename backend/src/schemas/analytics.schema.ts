import { z } from 'zod';
import { ANALYTICS_EVENT_NAMES } from '../analytics/proof.js';

const experimentGroupSchema = z.enum(['internal', 'external', 'demo']);
const DAY_MS = 86_400_000;

// strict(): 계약에 없는 필드(이메일·번역문 등)가 섞여 오면 저장하지 않고 거절한다.
export const analyticsEventSchema = z.object({
  eventName: z.enum(ANALYTICS_EVENT_NAMES as [string, ...string[]]),
  clientEventId: z.string().uuid(),
  occurredAt: z.string().datetime({ offset: true }).refine((value) => {
    const at = new Date(value).getTime();
    return at <= Date.now() + DAY_MS && at >= Date.now() - 30 * DAY_MS;
  }, 'occurredAt must be within the last 30 days'),
  // 무작위 ID만 받는다. 이메일 같은 값이 들어오지 않게 문자 종류를 제한한다.
  anonymousSessionId: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/),
  projectId: z.string().uuid().optional(),
  experimentGroup: experimentGroupSchema,
  durationMs: z.number().int().min(0).max(DAY_MS).optional(),
  imageCount: z.number().int().min(0).max(1000).optional(),
}).strict();

export type AnalyticsEventInput = z.infer<typeof analyticsEventSchema>;

export const proofQuerySchema = z.object({
  group: experimentGroupSchema.default('external'),
}).strict();
