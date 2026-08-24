import sharp from 'sharp';
import { afterEach, describe, expect, it, vi } from 'vitest';

const testEnv = vi.hoisted(() => ({
  OPENAI_API_KEY: 'test-openai-key',
  OPENAI_OCR_MODEL: 'gpt-5.6-luna',
  OPENAI_BASE_URL: 'https://api.example.test/v1',
  OCR_TIMEOUT_MS: 100,
  AI_MAX_RETRIES: 3,
}));

vi.mock('../../src/config/env.js', () => ({ env: testEnv }));

const { lunaOcrProvider } = await import('../../src/ocr/luna/luna-ocr.provider.js');

async function testImage(width: number, height: number): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: '#ffffff' } }).png().toBuffer();
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

function chatCompletion(content: string): unknown {
  return { choices: [{ message: { content } }] };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('lunaOcrProvider.recognize', () => {
  it('정규화된 box를 이미지 픽셀 크기의 polygon으로 변환한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(chatCompletion(JSON.stringify({
      regions: [{ text: '대박', confidence: 0.97, box: { x: 0.25, y: 0.4, width: 0.5, height: 0.2 } }],
    }))));
    vi.stubGlobal('fetch', fetchMock);

    const regions = await lunaOcrProvider.recognize(await testImage(1000, 500));

    expect(regions).toHaveLength(1);
    expect(regions[0].text).toBe('대박');
    expect(regions[0].confidence).toBe(0.97);
    const expectedPolygon = [{ x: 250, y: 200 }, { x: 750, y: 200 }, { x: 750, y: 300 }, { x: 250, y: 300 }];
    regions[0].polygon.forEach((point, index) => {
      expect(point.x).toBeCloseTo(expectedPolygon[index].x);
      expect(point.y).toBeCloseTo(expectedPolygon[index].y);
    });
  });

  it('한글이 없으면 빈 regions 배열을 그대로 반환한다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(chatCompletion(JSON.stringify({ regions: [] })))));

    await expect(lunaOcrProvider.recognize(await testImage(100, 100))).resolves.toEqual([]);
  });

  it('confidence 필드가 없으면 기본값 0.9를 사용한다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(chatCompletion(JSON.stringify({
      regions: [{ text: '헐', box: { x: 0, y: 0, width: 1, height: 1 } }],
    })))));

    const regions = await lunaOcrProvider.recognize(await testImage(10, 10));

    expect(regions[0].confidence).toBe(0.9);
  });

  it('429는 재시도 후 성공하면 정상 결과를 반환한다', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ error: 'rate limited' }, 429))
      .mockResolvedValueOnce(jsonResponse(chatCompletion(JSON.stringify({
        regions: [{ text: '오케이', confidence: 0.9, box: { x: 0, y: 0, width: 1, height: 1 } }],
      }))));
    vi.stubGlobal('fetch', fetchMock);

    const regions = await lunaOcrProvider.recognize(await testImage(10, 10));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(regions[0].text).toBe('오케이');
  });

  it('401 같은 영구 오류는 재시도하지 않고 즉시 실패한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ error: 'unauthorized' }, 401));
    vi.stubGlobal('fetch', fetchMock);

    await expect(lunaOcrProvider.recognize(await testImage(10, 10))).rejects.toMatchObject({ code: 'OCR_PROVIDER_FAILED' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('OPENAI_API_KEY가 없으면 요청 없이 즉시 실패한다', async () => {
    testEnv.OPENAI_API_KEY = '';
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(lunaOcrProvider.recognize(await testImage(10, 10))).rejects.toMatchObject({ code: 'OCR_PROVIDER_UNAVAILABLE' });
    expect(fetchMock).not.toHaveBeenCalled();

    testEnv.OPENAI_API_KEY = 'test-openai-key';
  });
});
