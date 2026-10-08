import { AppError } from '../errors/app-error.js';
import type { LocalizationBatchInput } from '../ai/localization/localization-provider.types.js';
import {
  bounded,
  checkExecution,
  createTranslationContext,
  executionError,
  executionSleep,
  retryableTranslationFailure,
  safeTranslationFailure,
  signalError,
} from './translation-execution.js';
import { rateLimitDelayMs } from './groq-rate-limit.js';
import { parseTranslationResponse } from './translation-response.parser.js';
import { buildTranslationMessages } from './translation-prompt.js';
import { buildChatRequest, type TranslationRequestConfig } from './translation-request.js';
import { validateTranslationResult } from '../ai/localization/localization-validator.js';
import type { TranslationExecutionContext } from './translation-provider.types.js';

class GroqQueue {
  private tail: Promise<void> = Promise.resolve();
  private blockedUntil = 0;
  block(ms: number) {
    this.blockedUntil = Math.max(this.blockedUntil, Date.now() + ms);
  }
  async run<T>(context: TranslationExecutionContext, work: () => Promise<T>): Promise<T> {
    let release!: () => void;
    const previous = this.tail;
    this.tail = new Promise<void>((resolve) => {
      release = resolve;
    });
    const started = Date.now();
    try {
      await bounded(context, async () => previous);
    } catch (error) {
      void previous.then(release, release);
      throw error;
    }
    try {
      context.onAttempt?.({ outcome: 'queue_wait', queueWaitMs: Date.now() - started });
      const wait = Math.max(0, this.blockedUntil - Date.now());
      if (wait) {
        const cooldownStarted = Date.now();
        try {
          await executionSleep(wait, context);
        } finally {
          context.onAttempt?.({
            outcome: 'cooldown_wait',
            cooldownWaitMs: Date.now() - cooldownStarted,
            requestedWaitMs: wait,
          });
        }
      }
      checkExecution(context);
      return await work();
    } finally {
      release();
    }
  }
}
const groqQueue = new GroqQueue();

export interface ChatCompletion {
  content: string;
  ms: number;
  promptTokens: number;
  completionTokens: number;
  attempts: number;
}

/** Shared HTTP, retry, queue and deadline path for production and evaluations. */
export async function executeChat<T = ChatCompletion>(
  config: TranslationRequestConfig,
  messages: Array<{ role: string; content: string }>,
  suppliedContext?: TranslationExecutionContext,
  parse?: (completion: ChatCompletion) => T,
): Promise<T> {
  if (!config.apiKey)
    throw new AppError('TRANSLATION_PROVIDER_UNAVAILABLE', {
      provider: config.provider,
      failureReason: 'configuration',
    });
  if (
    !Number.isInteger(config.attempts) ||
    config.attempts < 1 ||
    !Number.isFinite(config.timeoutMs) ||
    config.timeoutMs <= 0
  )
    throw new Error('Invalid translation request configuration');
  const context = createTranslationContext(suppliedContext);
  const providerContext =
    config.provider === 'openai'
      ? { ...context, deadlineAt: Math.min(context.deadlineAt, context.primaryDeadlineAt) }
      : context;
  const started = Date.now();
  for (let attempt = 1; attempt <= config.attempts; attempt++) {
    checkExecution(providerContext);
    const request = async () => {
      const body = buildChatRequest(config, messages);
      const account = context.beforeRequest?.(body);
      const attemptStarted = Date.now();
      context.onAttempt?.({ outcome: 'attempt_started', attempt });
      const timeoutContext = {
        ...providerContext,
        deadlineAt: Math.min(providerContext.deadlineAt, Date.now() + config.timeoutMs),
      };
      try {
        return await bounded(timeoutContext, async (signal) => {
          const response = await fetch(`${config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${config.apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
            signal,
          });
          const text = await response.text();
          if (!response.ok) {
            const retryAfterMs =
              config.provider === 'groq' && response.status === 429
                ? rateLimitDelayMs(response, text)
                : retryAfter(response.headers.get('retry-after'));
            if (config.provider === 'groq' && response.status === 429)
              groqQueue.block(retryAfterMs ?? 15_000);
            throw new AppError('TRANSLATION_PROVIDER_FAILED', {
              provider: config.provider,
              status: response.status,
              retryAfterMs,
            });
          }
          let raw: {
            choices?: Array<{ message?: { content?: string } }>;
            usage?: { prompt_tokens?: number; completion_tokens?: number };
          };
          try {
            raw = JSON.parse(text);
          } catch {
            throw new AppError('TRANSLATION_PROVIDER_FAILED', { failureReason: 'invalid_json' });
          }
          account?.(raw?.usage);
          checkExecution(timeoutContext);
          const content = raw?.choices?.[0]?.message?.content;
          if (typeof content !== 'string' || !content.trim())
            throw new AppError('TRANSLATION_PROVIDER_FAILED', { failureReason: 'empty_response' });
          const completion: ChatCompletion = {
            content,
            ms: Date.now() - started,
            promptTokens: raw.usage?.prompt_tokens ?? 0,
            completionTokens: raw.usage?.completion_tokens ?? 0,
            attempts: attempt,
          };
          const result = parse ? parse(completion) : (completion as T);
          checkExecution(timeoutContext);
          context.onAttempt?.({
            outcome: 'attempt_success',
            attempt,
            providerMs: Date.now() - attemptStarted,
            promptTokens: completion.promptTokens,
            completionTokens: completion.completionTokens,
          });
          return result;
        });
      } catch (original) {
        let error: unknown = original;
        if (context.signal?.aborted) error = signalError(context.signal);
        else if (Date.now() >= providerContext.deadlineAt) error = executionError('deadline');
        else if (original instanceof AppError && original.details?.failureReason === 'deadline')
          error = executionError('timeout');
        else if (!(original instanceof AppError))
          error = new AppError('TRANSLATION_PROVIDER_FAILED', { failureReason: 'network' });
        context.onAttempt?.({
          outcome: 'attempt_failed',
          attempt,
          providerMs: Date.now() - attemptStarted,
          ...safeTranslationFailure(error),
        });
        throw error;
      }
    };
    try {
      return config.provider === 'groq'
        ? await groqQueue.run(providerContext, request)
        : await request();
    } catch (error) {
      // Reservation failures are not AppErrors and must never trigger another attempt.
      if (
        !(error instanceof AppError) ||
        attempt === config.attempts ||
        !retryableTranslationFailure(error)
      )
        throw error;
      const retryAfterMs =
        typeof error.details?.retryAfterMs === 'number' ? error.details.retryAfterMs : 0;
      const delayMs = Math.max(1_000 * attempt, config.provider === 'openai' ? retryAfterMs : 0);
      context.onAttempt?.({
        outcome: 'retry_wait',
        attempt,
        requestedWaitMs: delayMs,
        ...safeTranslationFailure(error),
      });
      await executionSleep(delayMs, providerContext);
    }
  }
  throw executionError('deadline');
}

function retryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric >= 0) return numeric * 1000;
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : undefined;
}

export function executeTranslation(
  config: TranslationRequestConfig,
  input: LocalizationBatchInput,
  context?: TranslationExecutionContext,
  messages: Array<{ role: string; content: string }> = buildTranslationMessages(input),
) {
  return executeChat(config, messages, context, (completion) => {
    const results = parseTranslationResponse(completion.content, input);
    if ([...results.values()].some((result) => !validateTranslationResult(result).valid))
      throw new AppError('TRANSLATION_PROVIDER_FAILED', { failureReason: 'validation' });
    return results;
  });
}
