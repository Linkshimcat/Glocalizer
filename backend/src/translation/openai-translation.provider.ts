import { LOCALIZATION_PROMPT_VERSION } from '../ai/prompts/prompt-version.js';
import { env } from '../config/env.js';
import type { TranslationProvider } from './translation-provider.types.js';
import { translationRequestConfig } from './translation-request.js';
import { executeTranslation } from './translation-http.js';

export const openAiTranslationProvider: TranslationProvider = {
  name: 'openai',
  model: env.OPENAI_TRANSLATION_MODEL,
  promptVersion: LOCALIZATION_PROMPT_VERSION,
  localizeBatch: (input, context) =>
    executeTranslation(translationRequestConfig('openai', env), input, context),
};
