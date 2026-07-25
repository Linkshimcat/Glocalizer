import { afterEach, describe, expect, it, vi } from 'vitest';

const testEnv = vi.hoisted(() => ({
  GROQ_API_KEY: 'test-groq-key',
  GROQ_BASE_URL: 'https://api.example.test/v1',
  VISION_TIMEOUT_MS: 100,
  VISION_PROVIDER: 'groq' as const,
  GEMINI_API_KEY: undefined,
  GEMINI_VISION_MODEL: 'gemini-test',
  GROQ_VISION_MODEL: 'vision-test',
}));

const logger = vi.hoisted(() => ({ warn: vi.fn() }));

vi.mock('../../src/config/env.js', () => ({ env: testEnv }));
vi.mock('../../src/config/logger.js', () => ({ logger }));

const { requestVisionOcr } = await import('../../src/ocr/vision-fallback.service.js');

const candidate = {
  text: '킹받았죠?',
  confidence: 0.6,
  polygon: [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('requestVisionOcr', () => {
  it('Vision fallback 네트워크 오류에서는 null을 반환해 기존 Paddle 후보를 보존한다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network unavailable')));

    await expect(requestVisionOcr(Buffer.from('image'), candidate)).resolves.toBeNull();
    expect(logger.warn).toHaveBeenCalledWith(
      { provider: 'groq', reason: 'TypeError' },
      expect.stringContaining('기존 OCR 후보를 유지'),
    );
  });
});
