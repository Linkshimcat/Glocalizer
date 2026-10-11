import { checkServiceDependencies } from './repositories/health.repository.js';
import { startGenerationWorker } from './workers/generation-worker.js';
import type { Server } from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { ensureStorageBucket } from './config/supabase.js';
import { startExpiredProjectsSweep } from './workers/cleanup-scheduler.js';
import { startWorker } from './workers/worker.js';
import { shutdownServer } from './workers/shutdown.js';

function installShutdownHandlers(server: Server): void {
  let shuttingDown = false;
  const shutdown = async (signal: NodeJS.Signals) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Graceful shutdown 시작');
    try {
      await shutdownServer(server);
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
  const dependencies = await checkServiceDependencies();
  if (!dependencies.database || !dependencies.storage) throw new Error('Required backend migrations or storage configuration are missing');

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`Glocalizer backend running at http://localhost:${env.PORT}`);
  });

  startWorker();
  startGenerationWorker();
  startExpiredProjectsSweep();
  installShutdownHandlers(server);
}

main().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
