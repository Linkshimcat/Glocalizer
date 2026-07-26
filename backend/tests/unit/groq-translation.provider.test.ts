import { afterEach, describe, expect, it, vi } from 'vitest';

const testEnv = vi.hoisted(() => ({
  GROQ_API_KEY: 'test-groq-key',
  GROQ_MODEL: 'test-model',
  GROQ_BASE_URL: 'https://api.example.test/v1',
  TRANSLATION_TIMEOUT_MS: 100,
  AI_MAX_RETRIES: 3,
}));

vi.mock('../../src/config/env.js', () => ({ env: testEnv }));

const { groqTranslationProvider } = await import('../../src/translation/groq-translation.provider.js');

const input = {
  sourceText: '킹받았죠?',
  sourceLanguage: 'ko' as const,
  targetLanguages: ['en'] as const,
  context: { contentType: 'emoticon' as const, tone: 'funny', audience: 'teen', translationStyle: 'trendy' },
  constraintsByLanguage: { en: { maxCharacters: 18, textBoxWidth: 100, textBoxHeight: 30 } },
};

afterEach(() => vi.unstubAllGlobals());

describe('groqTranslationProvider retry policy', () => {
  it('인증 오류는 재시도하지 않고 즉시 실패한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('unauthorized', { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(groqTranslationProvider.localizeBatch(input)).rejects.toMatchObject({ code: 'TRANSLATION_PROVIDER_FAILED' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
