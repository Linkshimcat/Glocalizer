import { env } from '../config/env.js';
import { AppError } from '../errors/app-error.js';
import type { TranslationProvider } from './translation-provider.types.js';
import { buildTranslationMessages } from './translation-prompt.js';
import { parseTranslationResponse } from './translation-response.parser.js';
import { withRetry } from '../utils/retry.js';

function isRetryable(error: unknown): boolean {
  if (!(error instanceof AppError)) return true;
  if (error.code !== 'TRANSLATION_PROVIDER_FAILED') return false;
  const status = error.details?.status;
  if (typeof status !== 'number') return true;
  return status === 429 || status >= 500;
}

/**
 * OpenAI chat/completions 번역. 벤치마크(backend/benchmarks/translation)에서 같은 프롬프트로
 * Groq qwen 대비 훨씬 높은 점수를 받았고, Groq 무료 티어의 분당 출력 토큰 한도(≈2캡션/분)
 * 같은 처리량 병목이 없어 주력으로 쓴다. reasoning_effort는 low가 품질/지연 균형점이다
 * (none은 품질이 눈에 띄게 낮고, medium은 지연이 2배 이상인데 점수 차이는 미미).
 */
export const openAiTranslationProvider: TranslationProvider = {
  name: 'openai',
  model: env.OPENAI_TRANSLATION_MODEL,
  async localizeBatch(input) {
    if (!env.OPENAI_API_KEY) {
      throw new AppError('TRANSLATION_PROVIDER_UNAVAILABLE', { provider: 'openai' }, 'OPENAI_API_KEY가 설정되어 있지 않습니다.');
    }
    return withRetry(async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), env.OPENAI_TRANSLATION_TIMEOUT_MS);
      try {
        const response = await fetch(`${env.OPENAI_BASE_URL}/chat/completions`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: env.OPENAI_TRANSLATION_MODEL,
            // reasoning 토큰도 이 예산을 쓰므로 3개 언어 JSON이 잘리지 않게 넉넉히 잡는다.
            max_completion_tokens: 3000,
            reasoning_effort: env.OPENAI_TRANSLATION_REASONING_EFFORT,
            response_format: { type: 'json_object' },
            messages: buildTranslationMessages(input),
          }),
          signal: controller.signal,
        });
        const body = await response.text();
        if (!response.ok) {
          throw new AppError(
            'TRANSLATION_PROVIDER_FAILED',
            { provider: 'openai', status: response.status },
            `OpenAI 번역 요청이 실패했습니다. (${response.status})`,
          );
        }
        const raw = JSON.parse(body) as { choices?: Array<{ message?: { content?: string } }> };
        const content = raw.choices?.[0]?.message?.content;
        if (!content) throw new AppError('TRANSLATION_PROVIDER_FAILED', { provider: 'openai' }, 'OpenAI 응답에 번역 내용이 없습니다.');
        return parseTranslationResponse(content, input);
      } catch (error) {
        if (error instanceof AppError) throw error;
        const isTimeout = error instanceof Error && error.name === 'AbortError';
        throw new AppError(
          'TRANSLATION_PROVIDER_FAILED',
          isTimeout ? { provider: 'openai', timeoutMs: env.OPENAI_TRANSLATION_TIMEOUT_MS } : { provider: 'openai' },
          isTimeout ? 'OpenAI 번역 요청 시간이 초과되었습니다.' : 'OpenAI 번역 요청에 실패했습니다.',
        );
      } finally {
        clearTimeout(timeout);
      }
    }, { attempts: env.AI_MAX_RETRIES, delayMs: 1_000, shouldRetry: isRetryable });
  },
};
