import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const testEnv = vi.hoisted(() => ({
  ENABLE_CLEANUP_AI_FALLBACK: true,
  OPENAI_API_KEY: 'test-key',
  OPENAI_BASE_URL: 'https://api.example.test/v1',
  CLEANUP_AI_MODEL: 'test-image-model',
  CLEANUP_AI_TIMEOUT_MS: 1000,
  CLEANUP_AI_MAX_PER_HOUR: 2,
  LOG_LEVEL: 'silent',
}));
vi.mock('../../src/config/env.js', () => ({ env: testEnv }));

const { aiFallbackAvailable, removeTextWithAi, resetAiFallbackLimiterForTest } = await import('../../src/image/ai-text-removal.js');

const W = 200;
const H = 120;
const box = { x: 60, y: 40, width: 80, height: 30 };

async function target(alpha: number): Promise<Buffer> {
  const dark = await sharp({ create: { width: 80, height: 30, channels: 4, background: { r: 20, g: 20, b: 20, alpha: 1 } } }).png().toBuffer();
  return sharp({ create: { width: W, height: H, channels: 4, background: { r: 240, g: 240, b: 240, alpha } } })
    .composite([{ input: dark, left: box.x, top: box.y }]).png().toBuffer();
}

async function stubApi(color = { r: 0, g: 0, b: 255 }): Promise<ReturnType<typeof vi.fn>> {
  const edited = await sharp({ create: { width: 1024, height: 1024, channels: 4, background: { ...color, alpha: 1 } } }).png().toBuffer();
  const fetchMock = vi.fn().mockImplementation(async () => new Response(JSON.stringify({ data: [{ b64_json: edited.toString('base64') }] }), { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

async function pixel(buffer: Buffer, x: number, y: number): Promise<number[]> {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const base = (y * info.width + x) * 4;
  return [data[base], data[base + 1], data[base + 2], data[base + 3]];
}

beforeEach(() => {
  resetAiFallbackLimiterForTest();
  testEnv.ENABLE_CLEANUP_AI_FALLBACK = true;
});
afterEach(() => vi.unstubAllGlobals());

describe('removeTextWithAi', () => {
  it('편집 API 결과를 OCR 박스 영역 안에만 합성하고 박스 밖 픽셀은 바꾸지 않는다', async () => {
    const fetchMock = await stubApi();
    const source = await target(1);

    const result = await removeTextWithAi(source, source, box, W, H);

    expect(result).not.toBeNull();
    expect(await pixel(result!, 100, 55)).toEqual([0, 0, 255, 255]); // 박스 안쪽은 편집 결과
    for (const [x, y] of [[5, 5], [195, 115], [100, 100], [30, 55], [170, 55], [100, 20]]) {
      expect(await pixel(result!, x, y)).toEqual(await pixel(source, x, y)); // 박스 밖은 원본 그대로
    }
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.example.test/v1/images/edits');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-key');
    const form = init.body as FormData;
    expect(form.get('model')).toBe('test-image-model');
    expect(String(form.get('prompt'))).toContain('Keep everything outside the masked area exactly the same');
    expect(form.get('mask')).toBeInstanceOf(Blob);
  });

  it('투명 스티커도 박스 밖(투명 포함)은 그대로 두고 박스 안만 교체한다', async () => {
    await stubApi();
    const source = await target(0);
    const result = await removeTextWithAi(source, source, box, W, H);
    expect((await pixel(result!, 100, 55))[3]).toBe(255);
    expect((await pixel(result!, 5, 5))[3]).toBe(0);
  });

  it('원본에서 지우되 결과는 target(앞선 영역이 정리된 이미지) 위에 얹는다', async () => {
    await stubApi();
    const source = await target(1);
    const previous = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 10, g: 200, b: 10, alpha: 1 } } }).png().toBuffer();
    const result = await removeTextWithAi(source, previous, box, W, H);
    expect(await pixel(result!, 5, 5)).toEqual([10, 200, 10, 255]);
  });

  it('API가 실패하면 null을 돌려준다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('error', { status: 500 })));
    const source = await target(1);
    expect(await removeTextWithAi(source, source, box, W, H)).toBeNull();
  });

  it('폴백이 꺼져 있으면 API를 부르지 않는다', async () => {
    testEnv.ENABLE_CLEANUP_AI_FALLBACK = false;
    const fetchMock = await stubApi();
    const source = await target(1);
    expect(await removeTextWithAi(source, source, box, W, H)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('시간당 호출 상한을 넘으면 더 부르지 않는다', async () => {
    const fetchMock = await stubApi();
    const source = await target(1);
    await removeTextWithAi(source, source, box, W, H);
    await removeTextWithAi(source, source, box, W, H);
    expect(aiFallbackAvailable()).toBe(false);
    expect(await removeTextWithAi(source, source, box, W, H)).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(aiFallbackAvailable(Date.now() + 61 * 60 * 1000)).toBe(true); // 1시간이 지나면 다시 가능
  });
});
