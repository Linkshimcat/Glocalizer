import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { runExpiredProjectsCleanup } from './cleanup-expired.job.js';

let intervalHandle: NodeJS.Timeout | null = null;

export function startExpiredProjectsSweep(): void {
  const sweep = async () => {
    try {
      const deletedCount = await runExpiredProjectsCleanup();
      if (deletedCount > 0) {
        logger.info({ deletedCount }, '만료 프로젝트 정리 완료');
      }
    } catch (err) {
      logger.error({ err }, '만료 프로젝트 정리 중 오류');
    }
  };

  void sweep();
  intervalHandle = setInterval(sweep, env.CLEANUP_SWEEP_INTERVAL_MS);
}

export function stopExpiredProjectsSweep(): void {
  if (intervalHandle) clearInterval(intervalHandle);
}
