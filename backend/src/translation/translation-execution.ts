import { randomUUID } from 'node:crypto';
import { AppError } from '../errors/app-error.js';
import type { TranslationExecutionContext } from './translation-provider.types.js';

export function createTranslationContext(
  context?: TranslationExecutionContext,
  budgets = { primaryMs: 30_000, totalMs: 90_000 },
): TranslationExecutionContext {
  if (context) {
    if (!Number.isFinite(context.deadlineAt) || !Number.isFinite(context.primaryDeadlineAt))
      throw new Error('Translation deadlines must be finite');
    return context;
  }
  if (![budgets.primaryMs, budgets.totalMs].every((value) => Number.isFinite(value) && value > 0))
    throw new Error('Translation budgets must be positive');
  const now = Date.now();
  return {
    operationId: randomUUID(),
    phase: 'batch',
    primaryDeadlineAt: now + budgets.primaryMs,
    deadlineAt: now + budgets.totalMs,
  };
}

export function executionError(reason: 'deadline' | 'cancelled' | 'timeout'): AppError {
  return new AppError(
    'TRANSLATION_PROVIDER_FAILED',
    { failureReason: reason },
    reason === 'cancelled' ? '번역 작업이 취소되었습니다.' : '번역 처리 시간 한도를 초과했습니다.',
  );
}

export function checkExecution(context: TranslationExecutionContext): void {
  if (context.signal?.aborted) throw signalError(context.signal);
  if (Date.now() >= context.deadlineAt) throw executionError('deadline');
}

export function signalError(signal: AbortSignal): AppError {
  return signal.reason instanceof AppError && signal.reason.details?.failureReason === 'deadline'
    ? signal.reason
    : executionError('cancelled');
}

/** The race also bounds providers that ignore abort. The rejected work remains observed. */
export async function bounded<T>(
  context: TranslationExecutionContext,
  work: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  checkExecution(context);
  const controller = new AbortController();
  let rejectAbort!: (error: unknown) => void;
  const aborted = new Promise<never>((_, reject) => {
    rejectAbort = reject;
  });
  const abort = (reason: 'cancelled' | 'deadline') => {
    const error = executionError(reason);
    controller.abort(error);
    rejectAbort(error);
  };
  const cancel = () => {
    const error = signalError(context.signal!);
    controller.abort(error);
    rejectAbort(error);
  };
  const timer = setTimeout(() => abort('deadline'), Math.max(1, context.deadlineAt - Date.now()));
  context.signal?.addEventListener('abort', cancel, { once: true });
  try {
    return await Promise.race([Promise.resolve().then(() => work(controller.signal)), aborted]);
  } finally {
    clearTimeout(timer);
    context.signal?.removeEventListener('abort', cancel);
  }
}

export function executionSleep(ms: number, context: TranslationExecutionContext): Promise<void> {
  checkExecution(context);
  if (ms >= context.deadlineAt - Date.now()) return Promise.reject(executionError('deadline'));
  return bounded(
    context,
    (signal) =>
      new Promise((resolve, reject) => {
        const cancel = () => {
          clearTimeout(timer);
          reject(signal.reason);
        };
        const timer = setTimeout(() => {
          signal.removeEventListener('abort', cancel);
          resolve();
        }, ms);
        signal.addEventListener('abort', cancel, { once: true });
      }),
  );
}

const reasons = new Set([
  'deadline',
  'cancelled',
  'timeout',
  'network',
  'rate_limit',
  'server',
  'authentication',
  'configuration',
  'invalid_json',
  'schema',
  'missing_language',
  'validation',
  'empty_response',
  'unknown',
]);
export function safeTranslationFailure(error: unknown): {
  errorCode: string;
  failureReason: string;
  httpStatus?: number;
} {
  const details = error instanceof AppError ? error.details : undefined;
  const status = typeof details?.status === 'number' ? details.status : undefined;
  const explicit = typeof details?.failureReason === 'string' ? details.failureReason : '';
  const failureReason = reasons.has(explicit)
    ? explicit
    : status === 429
      ? 'rate_limit'
      : status && status >= 500
        ? 'server'
        : status === 401 || status === 403
          ? 'authentication'
          : status && status >= 400
            ? 'configuration'
            : error instanceof AppError && error.code === 'TRANSLATION_PROVIDER_UNAVAILABLE'
              ? 'configuration'
              : 'unknown';
  return {
    errorCode: error instanceof AppError ? error.code : 'UNEXPECTED_ERROR',
    failureReason,
    ...(status !== undefined ? { httpStatus: status } : {}),
  };
}

export function retryableTranslationFailure(error: unknown): boolean {
  const { failureReason } = safeTranslationFailure(error);
  return !['deadline', 'cancelled', 'authentication', 'configuration'].includes(failureReason);
}
