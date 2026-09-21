import { env } from '../config/env.js';
import { groqTranslationProvider } from './groq-translation.provider.js';
import { openAiTranslationProvider } from './openai-translation.provider.js';
import type { TranslationProvider } from './translation-provider.types.js';

/** primary가 실패(한도·장애·형식 오류)하면 fallback으로 한 번 더 시도한다. */
export function withFallback(primary: TranslationProvider, fallback: TranslationProvider): TranslationProvider {
  return {
    name: primary.name,
    model: primary.model,
    async localizeBatch(input) {
      try {
        return await primary.localizeBatch(input);
      } catch (primaryError) {
        try {
          return await fallback.localizeBatch(input);
        } catch {
          // 두 provider가 모두 실패하면 주력 provider의 원인이 더 유용하다.
          throw primaryError;
        }
      }
    },
  };
}

export function getTranslationProvider(): TranslationProvider {
  if (env.TRANSLATION_PROVIDER === 'openai') {
    // Groq 키가 있을 때만 fallback을 둔다. 키가 없으면 그대로 실패시켜 원인이 드러나게 한다.
    return env.GROQ_API_KEY ? withFallback(openAiTranslationProvider, groqTranslationProvider) : openAiTranslationProvider;
  }
  return groqTranslationProvider;
}
