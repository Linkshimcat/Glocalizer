import { LOCALIZATION_PROMPT_VERSION } from '../ai/prompts/prompt-version.js';
import { env } from '../config/env.js';
import type { TranslationProvider } from './translation-provider.types.js';
import { translationRequestConfig } from './translation-request.js';
import { executeTranslation } from './translation-http.js';

export { rateLimitDelayMs } from './groq-rate-limit.js';
export { buildPrompt } from './translation-prompt.js';
export const groqTranslationProvider: TranslationProvider = {
  name: 'groq',
  model: env.GROQ_MODEL,
  promptVersion: LOCALIZATION_PROMPT_VERSION,
  localizeBatch: (input, context) =>
    executeTranslation(translationRequestConfig('groq', env), input, context),
};
