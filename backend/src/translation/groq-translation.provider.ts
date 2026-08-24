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
    ...(input.context.siblingCaptions?.length
      ? [`Other captions in the same image (context only; do NOT translate these in this response): ${JSON.stringify(input.context.siblingCaptions)}`]
      : []),
    `Tone=${input.context.tone}; audience=${input.context.audience}; style=${input.context.translationStyle}.`,
    `Constraints: ${constraints.join('; ')}`,
    'JSON schema: {"translations":[{"languageCode":"en|ja|zh","candidates":[{"text":"string","tone":"string","meaning":"Korean explanation","best":true}],"recommendedStyle":{"fontCategory":"bold|comic|cute|handwriting|minimal","alignment":"left|center|right","strokeRecommended":false,"shadowRecommended":false}}]}',
  ].join('\n');
}

function isRetryable(error: unknown): boolean {
  if (!(error instanceof AppError)) return true;
  if (error.code !== 'TRANSLATION_PROVIDER_FAILED') return false;

  const status = error.details?.status;
  // 401/403/404 같은 영구 provider 설정 오류는 즉시 사용자에게 전달한다. JSON 형식 오류나
  // timeout처럼 HTTP status가 없는 실패는 같은 요청의 재시도로 정상화되는 경우가 있다.
  if (typeof status !== 'number') return true;
  return status === 429 || status >= 500;
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
            // 줄바꿈 병합으로 원문이 길어질 수 있어(merge-recognized-regions.ts), 3개 언어 응답이
            // 잘려서 JSON 파싱이 실패하지 않도록 넉넉히 잡는다.
            max_tokens: 1500,
            // GROQ_MODEL 기본값(qwen/qwen3.6-27b)은 reasoning 모델이라, 이 옵션이 없으면
            // max_tokens 예산을 숨겨진 reasoning에 다 쓰고 빈 응답을 반환하는 경우가 있다.
            reasoning_effort: 'none',
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
