import { randomUUID } from 'node:crypto';
import {
  bounded,
  checkExecution,
  createTranslationContext,
  executionError,
  safeTranslationFailure,
} from './translation-execution.js';
import type { TranslationProvider } from './translation-provider.types.js';

interface ObservationLogger {
  info(fields: Record<string, unknown>, message: string): void;
  warn(fields: Record<string, unknown>, message: string): void;
}
export function observeTranslationProvider(
  primary: TranslationProvider,
  fallback: TranslationProvider | undefined,
  logger: ObservationLogger,
  budgets = { primaryMs: 30_000, totalMs: 90_000 },
): TranslationProvider {
  return {
    name: primary.name,
    model: primary.model,
    promptVersion: primary.promptVersion,
    async localizeBatch(input, suppliedContext) {
      const context = {
        ...createTranslationContext(suppliedContext, budgets),
        callId: randomUUID(),
      };
      const started = Date.now();
      let providerStarted = started;
      const log = (
        outcome: string,
        provider: TranslationProvider,
        error?: unknown,
        additional: Record<string, unknown> = {},
        event = 'translation_call',
      ) => {
        const fields = {
          event,
          operationId: context.operationId,
          callId: context.callId,
          phase: context.phase,
          outcome,
          primaryProvider: primary.name,
          primaryModel: primary.model,
          actualProvider: provider.name,
          actualModel: provider.model,
          promptVersion: provider.promptVersion,
          targetLanguages: input.targetLanguages,
          elapsedMs: Date.now() - started,
          providerElapsedMs: Date.now() - providerStarted,
          ...(error ? safeTranslationFailure(error) : {}),
          ...additional,
        };
        if (error) logger.warn(fields, 'Translation provider outcome');
        else logger.info(fields, 'Translation provider outcome');
      };
      const invoke = async (provider: TranslationProvider, isPrimary: boolean) => {
        providerStarted = Date.now();
        const providerContext = {
          ...context,
          deadlineAt:
            isPrimary && provider.name === 'openai'
              ? Math.min(context.primaryDeadlineAt, context.deadlineAt)
              : context.deadlineAt,
          onAttempt: (fields: Record<string, unknown>) => {
            log(String(fields.outcome), provider, undefined, fields, 'translation_attempt');
            context.onAttempt?.(fields);
          },
        };
        const results = await bounded(providerContext, (signal) =>
          provider.localizeBatch(input, { ...providerContext, signal }),
        );
        for (const [language, result] of results)
          results.set(language, {
            ...result,
            execution: {
              provider: provider.name,
              model: provider.model,
              ...(provider.promptVersion ? { promptVersion: provider.promptVersion } : {}),
            },
          });
        return results;
      };
      log('primary_started', primary);
      try {
        const results = await invoke(primary, true);
        log('primary_success', primary);
        return results;
      } catch (primaryError) {
        if (context.signal?.aborted) {
          log('call_cancelled', primary, executionError('cancelled'));
          throw executionError('cancelled');
        }
        if (!fallback || Date.now() >= context.deadlineAt) {
          log('primary_failed', primary, primaryError);
          throw primaryError;
        }
        checkExecution(context);
        log('fallback_started', fallback, primaryError, {
          primaryElapsedMs: Date.now() - providerStarted,
        });
        try {
          const results = await invoke(fallback, false);
          log('fallback_success', fallback);
          return results;
        } catch (fallbackError) {
          log(
            context.signal?.aborted ? 'call_cancelled' : 'fallback_failed',
            fallback,
            fallbackError,
          );
          if (context.signal?.aborted) throw executionError('cancelled');
          // Preserve the primary error for the existing API error contract.
          throw primaryError;
        }
      }
    },
  };
}
