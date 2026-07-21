import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { processNextJob } from './job-runner.js';

let stopped = false;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loop(): Promise<void> {
  while (!stopped) {
    let processed = false;
    try {
      processed = await processNextJob();
    } catch (err) {
      logger.error({ err }, 'Worker 루프에서 처리되지 않은 오류');
    }

    if (!processed) {
      await sleep(env.WORKER_POLL_INTERVAL_MS);
    }
  }
}

/** 같은 Node 프로세스 안에서 도는 단순 polling worker. MVP 규모에서는 별도 큐 시스템 없이 충분하다. */
export function startWorker(): void {
  stopped = false;
  logger.info({ pollIntervalMs: env.WORKER_POLL_INTERVAL_MS }, 'Job worker 시작');
  void loop();
}

export function stopWorker(): void {
  stopped = true;
}
