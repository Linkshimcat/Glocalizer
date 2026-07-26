import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { requeueStaleRunningJobs } from '../repositories/job.repository.js';
import { processNextJob } from './job-runner.js';

let stopped = false;
let lastRecoverySweepAt = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loop(): Promise<void> {
  while (!stopped) {
    let processed = false;
    try {
      if (Date.now() - lastRecoverySweepAt >= env.JOB_RECOVERY_SWEEP_INTERVAL_MS) {
        const staleBefore = new Date(Date.now() - env.JOB_STALE_AFTER_MS);
        const recoveredCount = await requeueStaleRunningJobs(staleBefore);
        if (recoveredCount > 0) logger.warn({ recoveredCount }, '만료된 Job lease를 복구 큐에 넣었습니다.');
        lastRecoverySweepAt = Date.now();
      }
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
  lastRecoverySweepAt = Date.now();
  logger.info({ pollIntervalMs: env.WORKER_POLL_INTERVAL_MS }, 'Job worker 시작');
  void (async () => {
    try {
      const staleBefore = new Date(Date.now() - env.JOB_STALE_AFTER_MS);
      const recoveredCount = await requeueStaleRunningJobs(staleBefore);
      if (recoveredCount > 0) logger.warn({ recoveredCount }, '중단된 job을 복구 큐에 넣었습니다.');
    } catch (err) {
      logger.error({ err }, '중단된 job 복구 실패');
    }
    await loop();
  })();
}

export function stopWorker(): void {
  stopped = true;
}
