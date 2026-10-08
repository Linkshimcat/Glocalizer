import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LocalizationBatchInput } from '../../src/ai/localization/localization-provider.types.js';

const input: LocalizationBatchInput = {
  sourceText: 'PRIVATE_SOURCE',
  sourceLanguage: 'ko',
  targetLanguages: ['en'],
  context: { contentType: 'emoticon', tone: 'funny', audience: 'teen', translationStyle: 'trendy' },
  constraintsByLanguage: { en: { maxCharacters: 18, textBoxWidth: 100, textBoxHeight: 30 } },
};
const completion = (
  content = JSON.stringify({
    translations: [
      { languageCode: 'en', candidates: [{ text: 'Thanks!', best: true }], recommendedStyle: {} },
    ],
  }),
) =>
  new Response(
    JSON.stringify({
      choices: [{ message: { content } }],
      usage: { prompt_tokens: 100, completion_tokens: 50 },
    }),
  );
const logger = { info: vi.fn(), warn: vi.fn() };
async function setup() {
  const http = await import('../../src/translation/translation-http.js');
  const { translationRequestConfig } = await import('../../src/translation/translation-request.js');
  const { createTranslationContext } =
    await import('../../src/translation/translation-execution.js');
  const { observeTranslationProvider } =
    await import('../../src/translation/translation-observation.js');
  const make = (name: 'openai' | 'groq') => {
    const config = {
      ...translationRequestConfig(name, { OPENAI_API_KEY: 'test', GROQ_API_KEY: 'test' }),
      timeoutMs: 60_000,
    };
    return {
      name,
      model: config.model,
      promptVersion: config.promptVersion,
      localizeBatch: (
        value: LocalizationBatchInput,
        context?: ReturnType<typeof createTranslationContext>,
      ) => http.executeTranslation(config, value, context),
    };
  };
  return {
    ...http,
    createTranslationContext,
    make,
    observed: () => observeTranslationProvider(make('openai'), make('groq'), logger),
  };
}
beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.clearAllMocks();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('shared production translation execution', () => {
  it('bounds a hung primary to 30 seconds, aborts it and returns Groq provenance', async () => {
    const { observed } = await setup();
    let primarySignal: AbortSignal | undefined;
    const fetch = vi
      .fn()
      .mockImplementationOnce((_url, init) => {
        primarySignal = init.signal;
        return new Promise(() => {});
      })
      .mockImplementationOnce(() => completion());
    vi.stubGlobal('fetch', fetch);
    const work = observed().localizeBatch(input);
    await vi.advanceTimersByTimeAsync(30_000);
    const result = await work;
    expect(primarySignal?.aborted).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(result.get('en')?.execution).toMatchObject({
      provider: 'groq',
      promptVersion: 'localization-v2',
    });
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: 'fallback_started',
        failureReason: 'deadline',
        elapsedMs: 30_000,
      }),
      expect.any(String),
    );
  });
  it('recovers a transient 503 on OpenAI without entering fallback', async () => {
    const { observed } = await setup();
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockImplementationOnce(() => completion());
    vi.stubGlobal('fetch', fetch);
    const work = observed().localizeBatch(input);
    await vi.advanceTimersByTimeAsync(1000);
    expect((await work).get('en')?.execution?.provider).toBe('openai');
    expect(logger.info.mock.calls.some(([row]) => row.outcome === 'fallback_started')).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it.each([401, 403, 404])('does not retry permanent HTTP %s before fallback', async (status) => {
    const { observed } = await setup();
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status }))
      .mockImplementationOnce(() => completion());
    vi.stubGlobal('fetch', fetch);
    expect((await observed().localizeBatch(input)).get('en')?.execution?.provider).toBe('groq');
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('does not start fallback after caller cancellation and logs no private error text', async () => {
    const { observed, createTranslationContext } = await setup();
    const controller = new AbortController();
    const fetch = vi.fn().mockImplementation(() => new Promise(() => {}));
    vi.stubGlobal('fetch', fetch);
    const context = { ...createTranslationContext(), signal: controller.signal };
    const work = observed().localizeBatch(input, context);
    const assertion = expect(work).rejects.toMatchObject({
      details: { failureReason: 'cancelled' },
    });
    await vi.advanceTimersByTimeAsync(1);
    controller.abort(new Error('PRIVATE_FAILURE'));
    await assertion;
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(JSON.stringify([...logger.info.mock.calls, ...logger.warn.mock.calls])).not.toMatch(
      /PRIVATE_SOURCE|PRIVATE_FAILURE/,
    );
  });
  it('reuses the exhausted primary deadline on language recovery', async () => {
    const { observed, createTranslationContext } = await setup();
    const fetch = vi
      .fn()
      .mockImplementationOnce(() => new Promise(() => {}))
      .mockImplementation(() => completion());
    vi.stubGlobal('fetch', fetch);
    const context = createTranslationContext();
    const wrapper = observed();
    const work = wrapper.localizeBatch(input, context);
    await vi.advanceTimersByTimeAsync(30_000);
    await work;
    await wrapper.localizeBatch(input, { ...context, phase: 'language_recovery' });
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch.mock.calls[2][0]).toContain('groq');
    const calls = logger.info.mock.calls
      .map(([row]) => row)
      .filter((row) => row.outcome === 'primary_started');
    expect(new Set(calls.map((row) => row.operationId)).size).toBe(1);
    expect(new Set(calls.map((row) => row.callId)).size).toBe(2);
  });
  it('bounds a hung fallback with the remaining 90-second operation deadline', async () => {
    const { observed } = await setup();
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(new Response('', { status: 401 }))
        .mockImplementation(() => new Promise(() => {})),
    );
    const work = observed().localizeBatch(input);
    const assertion = expect(work).rejects.toMatchObject({ details: { status: 401 } });
    await vi.advanceTimersByTimeAsync(90_000);
    await assertion;
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: 'fallback_failed',
        failureReason: 'deadline',
        elapsedMs: 90_000,
      }),
      expect.any(String),
    );
  });
  it.each([
    'not json',
    '{"translations":[]}',
    '{"translations":[{"languageCode":"en","candidates":[{"text":"shit"}],"recommendedStyle":{}}]}',
  ])('retries malformed or invalid provider results, then falls back', async (content) => {
    const { observed } = await setup();
    const fetch = vi
      .fn()
      .mockImplementationOnce(() => completion(content))
      .mockImplementationOnce(() => completion(content))
      .mockImplementationOnce(() => completion(content))
      .mockImplementationOnce(() => completion());
    vi.stubGlobal('fetch', fetch);
    const work = observed().localizeBatch(input);
    await vi.advanceTimersByTimeAsync(3000);
    expect((await work).get('en')?.execution?.provider).toBe('groq');
    expect(fetch).toHaveBeenCalledTimes(4);
  });
  it('rejects a cooldown that cannot fit without sending another HTTP request', async () => {
    const { executeChat, createTranslationContext } = await setup();
    const { translationRequestConfig } =
      await import('../../src/translation/translation-request.js');
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response('', { status: 429, headers: { 'retry-after': '60' } }));
    vi.stubGlobal('fetch', fetch);
    const context = createTranslationContext(undefined, { primaryMs: 1000, totalMs: 2000 });
    const work = executeChat(
      translationRequestConfig('groq', { GROQ_API_KEY: 'test' }),
      [],
      context,
    );
    const assertion = expect(work).rejects.toMatchObject({
      details: { failureReason: 'deadline' },
    });
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('cancels a queued call without allowing later calls to overtake the active HTTP request', async () => {
    const { make, createTranslationContext } = await setup();
    let release!: (value: Response) => void;
    const fetch = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            release = resolve;
          }),
      )
      .mockImplementation(() => completion());
    vi.stubGlobal('fetch', fetch);
    const provider = make('groq');
    const first = provider.localizeBatch(input);
    await vi.advanceTimersByTimeAsync(1);
    const controller = new AbortController();
    const middle = provider.localizeBatch(input, {
      ...createTranslationContext(),
      signal: controller.signal,
    });
    const assertion = expect(middle).rejects.toMatchObject({
      details: { failureReason: 'cancelled' },
    });
    const last = provider.localizeBatch(input);
    controller.abort();
    await assertion;
    expect(fetch).toHaveBeenCalledTimes(1);
    release(completion());
    await first;
    await last;
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('reserves every HTTP retry and reports usage from a malformed translation envelope', async () => {
    const { make, createTranslationContext } = await setup();
    const accounts = [vi.fn(), vi.fn()];
    const beforeRequest = vi.fn().mockReturnValueOnce(accounts[0]).mockReturnValueOnce(accounts[1]);
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementationOnce(() => completion('not json'))
        .mockImplementationOnce(() => completion()),
    );
    const work = make('openai').localizeBatch(input, {
      ...createTranslationContext(),
      beforeRequest,
    });
    await vi.advanceTimersByTimeAsync(1000);
    await work;
    expect(beforeRequest).toHaveBeenCalledTimes(2);
    expect(accounts[0]).toHaveBeenCalledWith({ prompt_tokens: 100, completion_tokens: 50 });
    expect(accounts[1]).toHaveBeenCalledTimes(1);
  });
  it('does not send or retry when cost reservation is refused', async () => {
    const { make, createTranslationContext } = await setup();
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const error = new Error('budget exhausted');
    await expect(
      make('openai').localizeBatch(input, {
        ...createTranslationContext(),
        beforeRequest: () => {
          throw error;
        },
      }),
    ).rejects.toBe(error);
    expect(fetch).not.toHaveBeenCalled();
  });
});
