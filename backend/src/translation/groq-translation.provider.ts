import { env } from '../config/env.js';
import { AppError } from '../errors/app-error.js';
import type { LocalizationBatchInput } from '../ai/localization/localization-provider.types.js';
import type { TranslationProvider } from './translation-provider.types.js';
import { parseTranslationResponse } from './translation-response.parser.js';
import { withRetry } from '../utils/retry.js';

function buildPrompt(input: LocalizationBatchInput): string {
  const constraints = input.targetLanguages.map((languageCode) => {
    const constraint = input.constraintsByLanguage[languageCode];
    return `${languageCode}: maximum ${constraint?.maxCharacters ?? 18} characters`;
  });
  return [
    'You are a sharp, internet-native localization writer for Korean emoticons.',
    'Translate one Korean emoticon phrase for global users. Prioritize funny, clever, meme-aware reactions that feel native in the target language.',
    'Return JSON only. For each requested language, return exactly three short, distinct candidates and exactly one best=true.',
    'Candidate roles: (1) BEST: the funniest and most shareable reaction, (2) ALT: a playful casual reaction, (3) SAFE: a clear meaning-preserving fallback.',
    'Use target-language internet culture naturally; do not force slang, explain jokes, use hate, sexual content, or profanity. Emojis are allowed only when they improve the punchline.',
    'Never leave Korean in the translated candidate text.',
    `Source Korean: ${JSON.stringify(input.sourceText)}`,
    `Tone=${input.context.tone}; audience=${input.context.audience}; style=${input.context.translationStyle}.`,
    `Constraints: ${constraints.join('; ')}`,
    'JSON schema: {"translations":[{"languageCode":"en|ja|zh","candidates":[{"text":"string","tone":"string","meaning":"Korean explanation","best":true}],"recommendedStyle":{"fontCategory":"bold|comic|cute|handwriting|minimal","alignment":"left|center|right","strokeRecommended":false,"shadowRecommended":false}}]}',
  ].join('\n');
}

function isRetryable(error: unknown): boolean {
  // 모델 출력 형식은 같은 요청을 다시 시도했을 때 정상화되는 경우가 많다.
  if (error instanceof AppError && error.code === 'TRANSLATION_PROVIDER_FAILED') return true;
  return error instanceof AppError && typeof error.details?.status === 'number'
    ? error.details.status === 429 || error.details.status >= 500
    : !(error instanceof AppError);
}

export const groqTranslationProvider: TranslationProvider = {
  name: 'groq',
  model: env.GROQ_MODEL,
  async localizeBatch(input) {
    if (!env.GROQ_API_KEY) {
      throw new AppError('TRANSLATION_PROVIDER_UNAVAILABLE', { provider: 'groq' }, 'GROQ_API_KEY가 설정되어 있지 않습니다.');
    }
    return withRetry(async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), env.TRANSLATION_TIMEOUT_MS);
      try {
        const response = await fetch(`${env.GROQ_BASE_URL}/chat/completions`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: env.GROQ_MODEL,
            temperature: 0.75,
            max_tokens: 900,
            response_format: { type: 'json_object' },
            messages: [{ role: 'user', content: buildPrompt(input) }],
          }),
          signal: controller.signal,
        });
        const body = await response.text();
        if (!response.ok) {
          throw new AppError('TRANSLATION_PROVIDER_FAILED', { provider: 'groq', status: response.status }, `Groq 번역 요청이 실패했습니다. (${response.status})`);
        }
        const raw = JSON.parse(body) as { choices?: Array<{ message?: { content?: string } }> };
        const content = raw.choices?.[0]?.message?.content;
        if (!content) throw new AppError('TRANSLATION_PROVIDER_FAILED', { provider: 'groq' }, 'Groq 응답에 번역 내용이 없습니다.');
        return parseTranslationResponse(content, input);
      } catch (error) {
        if (error instanceof AppError) throw error;
        const isTimeout = error instanceof Error && error.name === 'AbortError';
        throw new AppError('TRANSLATION_PROVIDER_FAILED', isTimeout ? { provider: 'groq', timeoutMs: env.TRANSLATION_TIMEOUT_MS } : { provider: 'groq' }, isTimeout ? 'Groq 번역 요청 시간이 초과되었습니다.' : 'Groq 번역 요청에 실패했습니다.');
      } finally {
        clearTimeout(timeout);
      }
    }, { attempts: env.AI_MAX_RETRIES, delayMs: 300, shouldRetry: isRetryable });
  },
};
