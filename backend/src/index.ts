import type { Server } from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { ensureStorageBucket } from './config/supabase.js';
import { startExpiredProjectsSweep, stopExpiredProjectsSweep } from './workers/cleanup-scheduler.js';
import { startWorker, stopWorker } from './workers/worker.js';
import { waitForActiveJobs } from './workers/job-runner.js';

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

function installShutdownHandlers(server: Server): void {
  let shuttingDown = false;
  const shutdown = async (signal: NodeJS.Signals) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Graceful shutdown 시작');
    stopWorker();
    stopExpiredProjectsSweep();

    try {
      await closeServer(server);
      const completed = await waitForActiveJobs(env.SHUTDOWN_GRACE_MS);
      if (!completed) logger.warn({ graceMs: env.SHUTDOWN_GRACE_MS }, '진행 중인 Job이 남은 상태로 종료합니다. lease recovery가 다시 처리합니다.');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Graceful shutdown 실패');
      process.exit(1);
    }
  };

  process.once('SIGTERM', () => { void shutdown('SIGTERM'); });
  process.once('SIGINT', () => { void shutdown('SIGINT'); });
}

async function main() {
  await ensureStorageBucket();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`Glocalizer backend running at http://localhost:${env.PORT}`);
  });

  startWorker();
  startExpiredProjectsSweep();
  installShutdownHandlers(server);
}

main().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
