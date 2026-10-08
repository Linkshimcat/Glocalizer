import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { runExpiredProjectsCleanup } from './cleanup-expired.job.js';

let active: Promise<void> | null = null;
let intervalHandle: NodeJS.Timeout | null = null;

export function startExpiredProjectsSweep(): void {
  if (intervalHandle) return;
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

  const run = () => {
    if (!active) active = sweep().finally(() => { active = null; });
  };
  run();
  intervalHandle = setInterval(run, env.CLEANUP_SWEEP_INTERVAL_MS);
}

export async function stopExpiredProjectsSweep(): Promise<void> {
  if (intervalHandle) clearInterval(intervalHandle);
  intervalHandle = null;
  if (active) await active;
}
