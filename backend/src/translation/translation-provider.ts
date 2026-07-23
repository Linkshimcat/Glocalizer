import { env } from '../config/env.js';
import { groqTranslationProvider } from './groq-translation.provider.js';
import type { TranslationProvider } from './translation-provider.types.js';

export function getTranslationProvider(): TranslationProvider {
  if (env.TRANSLATION_PROVIDER === 'groq') return groqTranslationProvider;
  return groqTranslationProvider;
}
