import { randomUUID } from 'node:crypto';
import { env } from './env.js';

function createWorkerId(configuredId: string | undefined): string {
  const normalized = configuredId?.trim();
  return normalized && normalized.length > 0 ? normalized : `worker_${randomUUID()}`;
}

/** 프로세스가 살아 있는 동안 변하지 않는 worker 식별자. job lease의 소유자 판별에 사용한다. */
export const runtime = {
  workerId: createWorkerId(env.WORKER_ID),
};
