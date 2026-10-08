import type { Server } from 'node:http';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { abortAllTasks, beginShutdown } from '../utils/task-context.js';
import { stopWorker } from './worker.js';
import { stopGenerationWorker } from './generation-worker.js';
import { stopExpiredProjectsSweep } from './cleanup-scheduler.js';
import { waitForActiveJobs } from './job-runner.js';

/** One deadline includes HTTP connections and every worker, starting at the signal. */
export async function shutdownServer(server: Server, graceMs = env.SHUTDOWN_GRACE_MS): Promise<boolean> {
  beginShutdown();
  let timer: NodeJS.Timeout | undefined;
  const deadline = new Promise<boolean>(resolve => { timer = setTimeout(() => resolve(false), graceMs); });
  try {
    const http = new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    const workers = Promise.all([stopWorker(), stopGenerationWorker(), stopExpiredProjectsSweep(), waitForActiveJobs(graceMs)]);
    const completed = await Promise.race([Promise.all([http, workers]).then(() => true), deadline]);
    if (!completed) {
      logger.warn({ graceMs }, 'Shutdown deadline exceeded; cancelling work and preserving DB recovery records');
      abortAllTasks();
      server.closeAllConnections();
    }
    return completed;
  } finally { if (timer) clearTimeout(timer); }
}
