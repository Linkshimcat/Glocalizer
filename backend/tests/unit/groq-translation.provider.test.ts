import { afterEach, describe, expect, it, vi } from 'vitest';

const testEnv = vi.hoisted(() => ({
  GROQ_API_KEY: 'test-groq-key',
  GROQ_MODEL: 'test-model',
  GROQ_BASE_URL: 'https://api.example.test/v1',
  TRANSLATION_TIMEOUT_MS: 100,
  AI_MAX_RETRIES: 3,
}));

vi.mock('../../src/config/env.js', () => ({ env: testEnv }));

const { groqTranslationProvider, rateLimitDelayMs } = await import('../../src/translation/groq-translation.provider.js');

const input = {
  sourceText: '킹받았죠?',
  sourceLanguage: 'ko' as const,
  targetLanguages: ['en'] as const,
  context: { contentType: 'emoticon' as const, tone: 'funny', audience: 'teen', translationStyle: 'trendy' },
  constraintsByLanguage: { en: { maxCharacters: 18, textBoxWidth: 100, textBoxHeight: 30 } },
};

afterEach(() => vi.unstubAllGlobals());

describe('groqTranslationProvider retry policy', () => {
  it('토큰만 소진된 429에서는 소진되지 않은 요청 한도의 긴 reset을 무시한다', () => {
    const response = new Response('rate limited', {
      status: 429,
      headers: {
        'x-ratelimit-remaining-requests': '955',
        'x-ratelimit-remaining-tokens': '0',
        'x-ratelimit-reset-requests': '1h4m48s',
        'x-ratelimit-reset-tokens': '285ms',
      },
    });

    expect(rateLimitDelayMs(response, 'rate limited')).toBe(15_000);
  });

  it('인증 오류는 재시도하지 않고 즉시 실패한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('unauthorized', { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(groqTranslationProvider.localizeBatch(input)).rejects.toMatchObject({ code: 'TRANSLATION_PROVIDER_FAILED' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('429의 Retry-After를 공유한 뒤 요청을 재시도한다', async () => {
    const validBody = JSON.stringify({ choices: [{ message: { content: JSON.stringify({
      translations: [{
        languageCode: 'en',
        candidates: [
          { text: 'So annoyed!', tone: 'funny', meaning: '킹받음', best: true },
          { text: 'I am pressed', tone: 'casual', meaning: '열받음', best: false },
          { text: 'This bugs me', tone: 'safe', meaning: '짜증남', best: false },
        ],
        recommendedStyle: { fontCategory: 'bold', alignment: 'center', strokeRecommended: false, shadowRecommended: false },
      }],
    }) } }] });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: 'Please try again in 1ms.' } }), {
        status: 429,
        headers: { 'Retry-After': '0' },
      }))
      .mockResolvedValueOnce(new Response(validBody, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await groqTranslationProvider.localizeBatch(input);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.get('en')?.candidates).toHaveLength(3);
  }, 20_000);

  it('동시에 시작한 번역 요청도 provider HTTP 호출은 직렬화한다', async () => {
    let active = 0;
    let maxActive = 0;
    const validBody = JSON.stringify({ choices: [{ message: { content: JSON.stringify({
      translations: [{
        languageCode: 'en',
        candidates: [
          { text: 'So annoyed!', tone: 'funny', meaning: '킹받음', best: true },
          { text: 'I am pressed', tone: 'casual', meaning: '열받음', best: false },
          { text: 'This bugs me', tone: 'safe', meaning: '짜증남', best: false },
        ],
        recommendedStyle: { fontCategory: 'bold', alignment: 'center', strokeRecommended: false, shadowRecommended: false },
      }],
    }) } }] });
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return new Response(validBody, { status: 200 });
    }));

    await Promise.all([
      groqTranslationProvider.localizeBatch(input),
      groqTranslationProvider.localizeBatch({ ...input, sourceText: '완전 열받아' }),
      groqTranslationProvider.localizeBatch({ ...input, sourceText: '화난다' }),
    ]);

    expect(maxActive).toBe(1);
  });
});
