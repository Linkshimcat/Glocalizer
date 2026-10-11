import { throwIfTaskCancelled } from './task-context.js';
interface RetryOptions {
  attempts: number;
  delayMs?: number;
  shouldRetry?: (err: unknown) => boolean;
}

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
  const { attempts, delayMs = 500, shouldRetry = () => true } = options;

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    throwIfTaskCancelled();
    try {
      return await fn();
    } catch (err) {
      throwIfTaskCancelled();
      lastError = err;
      if (attempt === attempts || !shouldRetry(err)) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }
  throw lastError;
}
