import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { groqTranslationProvider } from './groq-translation.provider.js';
import { openAiTranslationProvider } from './openai-translation.provider.js';
import type { TranslationProvider } from './translation-provider.types.js';

import { observeTranslationProvider } from './translation-observation.js';

function observed(
  primary: TranslationProvider,
  fallback?: TranslationProvider,
): TranslationProvider {
  return observeTranslationProvider(primary, fallback, logger, {
    primaryMs: env.TRANSLATION_PRIMARY_BUDGET_MS ?? 30_000,
    totalMs: env.TRANSLATION_OPERATION_BUDGET_MS ?? 90_000,
  });
}

export function withFallback(
  primary: TranslationProvider,
  fallback: TranslationProvider,
): TranslationProvider {
  return observed(primary, fallback);
}

export function getTranslationProvider(): TranslationProvider {
  if (env.TRANSLATION_PROVIDER === 'openai') {
    return env.GROQ_API_KEY
      ? withFallback(openAiTranslationProvider, groqTranslationProvider)
      : observed(openAiTranslationProvider);
  }
  return observed(groqTranslationProvider);
}
