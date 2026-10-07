import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { AppError } from '../errors/app-error.js';
import { groqTranslationProvider } from './groq-translation.provider.js';
import { openAiTranslationProvider } from './openai-translation.provider.js';
import type { TranslationProvider } from './translation-provider.types.js';

/** Observe a logical translation call, after each provider's own HTTP retries. No text is logged. */
function observed(primary: TranslationProvider, fallback?: TranslationProvider): TranslationProvider {
  return {
    name: primary.name,
    model: primary.model,
    async localizeBatch(input) {
      const callId = randomUUID();
      const started = Date.now();
      const log = (outcome: string, provider: TranslationProvider, error?: unknown) => {
        const fields = {
          event: 'translation_call', callId, outcome,
          primaryProvider: primary.name, primaryModel: primary.model,
          actualProvider: provider.name, actualModel: provider.model,
          targetLanguages: input.targetLanguages, elapsedMs: Date.now() - started,
          ...(error ? { errorCode: error instanceof AppError ? error.code : 'UNEXPECTED_ERROR', httpStatus: error instanceof AppError && typeof error.details?.status === 'number' ? error.details.status : undefined } : {}),
        };
        if (error) logger.warn(fields, 'Translation provider outcome');
        else logger.info(fields, 'Translation provider outcome');
      };
      const invoke = async (provider: TranslationProvider) => {
        const results = await provider.localizeBatch(input);
        for (const [language, result] of results) results.set(language, { ...result, execution: { provider: provider.name, model: provider.model } });
        return results;
      };
      log('primary_started', primary);
      try {
        const results = await invoke(primary);
        log('primary_success', primary);
        return results;
      } catch (primaryError) {
        if (!fallback) { log('primary_failed', primary, primaryError); throw primaryError; }
        log('fallback_started', fallback, primaryError);
        try {
          const results = await invoke(fallback);
          log('fallback_success', fallback);
          return results;
        } catch (fallbackError) {
          log('fallback_failed', fallback, fallbackError);
          throw primaryError;
        }
      }
    },
  };
}

export function withFallback(primary: TranslationProvider, fallback: TranslationProvider): TranslationProvider {
  return observed(primary, fallback);
}

export function getTranslationProvider(): TranslationProvider {
  if (env.TRANSLATION_PROVIDER === 'openai') {
    return env.GROQ_API_KEY ? withFallback(openAiTranslationProvider, groqTranslationProvider) : observed(openAiTranslationProvider);
  }
  return observed(groqTranslationProvider);
}
