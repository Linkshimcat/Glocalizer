import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { ensureStorageBucket } from './config/supabase.js';

async function main() {
  await ensureStorageBucket();

  const app = createApp();
  app.listen(env.PORT, () => {
    logger.info(`Glocalizer backend running at http://localhost:${env.PORT}`);
  });
}

main().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
