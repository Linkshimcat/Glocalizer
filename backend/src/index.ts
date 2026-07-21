import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { ensureStorageBucket } from './config/supabase.js';
import { startExpiredProjectsSweep } from './workers/cleanup-scheduler.js';
import { startWorker } from './workers/worker.js';

async function main() {
  await ensureStorageBucket();

  const app = createApp();
  app.listen(env.PORT, () => {
    logger.info(`Glocalizer backend running at http://localhost:${env.PORT}`);
  });

  startWorker();
  startExpiredProjectsSweep();
}

main().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
