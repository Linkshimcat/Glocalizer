import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LocalizationBatchInput } from '../../src/ai/localization/localization-provider.types.js';
import type { TranslationProvider } from '../../src/translation/translation-provider.types.js';

vi.mock('../../src/config/env.js', () => ({
  env: {
    OPENAI_API_KEY: 'k',
    OPENAI_BASE_URL: 'https://openai.test/v1',
    OPENAI_TRANSLATION_MODEL: 'gpt-5.6',
    OPENAI_TRANSLATION_REASONING_EFFORT: 'low',
    OPENAI_TRANSLATION_TIMEOUT_MS: 5000,
    AI_MAX_RETRIES: 1,
    GROQ_API_KEY: 'g',
    GROQ_MODEL: 'm',
    TRANSLATION_PROVIDER: 'openai',
  },
}));

const input: LocalizationBatchInput = {
  sourceText: '고마워요',
  targetLanguages: ['en'],
  constraintsByLanguage: { en: { maxCharacters: 18, textBoxWidth: 100, textBoxHeight: 50 } },
  context: { tone: 'funny', audience: 'teen', translationStyle: 'trendy' },
} as LocalizationBatchInput;

const okBody = JSON.stringify({
  choices: [{ message: { content: JSON.stringify({ translations: [{ languageCode: 'en', candidates: [
    { text: 'Thank you!', tone: 'polite', meaning: '감사', best: true },
    { text: 'Thanks a lot', tone: 'casual', meaning: '감사', best: false },
    { text: 'Much obliged', tone: 'safe', meaning: '감사', best: false },
  ] }] }) } }],
});

afterEach(() => vi.unstubAllGlobals());

describe('openAiTranslationProvider', () => {
  it('새 프롬프트와 reasoning_effort로 호출하고 응답을 파싱한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(okBody, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const { openAiTranslationProvider } = await import('../../src/translation/openai-translation.provider.js');
    const result = await openAiTranslationProvider.localizeBatch(input);
    expect(result.get('en')?.candidates[0].text).toBe('Thank you!');
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.model).toBe('gpt-5.6');
    expect(body.reasoning_effort).toBe('low');
    expect(body.messages[0].role).toBe('system');
  });

  it('인증 오류는 재시도 없이 실패한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('no', { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);
    const { openAiTranslationProvider } = await import('../../src/translation/openai-translation.provider.js');
    await expect(openAiTranslationProvider.localizeBatch(input)).rejects.toMatchObject({ code: 'TRANSLATION_PROVIDER_FAILED' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('withFallback', () => {
  const make = (impl: TranslationProvider['localizeBatch']): TranslationProvider => ({ name: 'x', model: 'm', localizeBatch: impl });

  it('primary 실패 시 fallback 결과를 반환한다', async () => {
    const { withFallback } = await import('../../src/translation/translation-provider.js');
    const expected = new Map();
    const provider = withFallback(make(async () => { throw new Error('primary'); }), make(async () => expected));
    await expect(provider.localizeBatch(input)).resolves.toBe(expected);
  });

  it('둘 다 실패하면 primary 오류를 던진다', async () => {
    const { withFallback } = await import('../../src/translation/translation-provider.js');
    const provider = withFallback(make(async () => { throw new Error('primary'); }), make(async () => { throw new Error('fallback'); }));
    await expect(provider.localizeBatch(input)).rejects.toThrow('primary');
  });
});
