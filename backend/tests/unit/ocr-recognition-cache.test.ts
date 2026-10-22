import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearOcrRecognitionCacheForTests, recognizeWithCache } from '../../src/ocr/ocr-recognition-cache.js';
import type { OcrProvider } from '../../src/ocr/ocr-provider.types.js';

function providerReturning(name: string, text: string): OcrProvider {
  return { name, recognize: vi.fn().mockResolvedValue([{ text, confidence: 0.9, polygon: [] }]) };
}

describe('recognizeWithCache', () => {
  beforeEach(() => {
    clearOcrRecognitionCacheForTests();
  });

  it('같은 provider·같은 이미지 바이트면 두 번째 호출에서 recognize를 다시 부르지 않는다', async () => {
    const provider = providerReturning('luna', '안녕');
    const image = Buffer.from('same-bytes');

    await recognizeWithCache(provider, image);
    const second = await recognizeWithCache(provider, image);

    expect(provider.recognize).toHaveBeenCalledTimes(1);
    expect(second[0].text).toBe('안녕');
  });

  it('이미지 바이트가 다르면 캐시를 타지 않고 새로 호출한다', async () => {
    const provider = providerReturning('luna', '안녕');

    await recognizeWithCache(provider, Buffer.from('image-a'));
    await recognizeWithCache(provider, Buffer.from('image-b'));

    expect(provider.recognize).toHaveBeenCalledTimes(2);
  });

  it('같은 이미지라도 provider 이름이 다르면 서로 캐시를 공유하지 않는다', async () => {
    const image = Buffer.from('same-bytes');
    const luna = providerReturning('luna', '루나결과');
    const paddle = providerReturning('paddle', '패들결과');

    const lunaResult = await recognizeWithCache(luna, image);
    const paddleResult = await recognizeWithCache(paddle, image);

    expect(lunaResult[0].text).toBe('루나결과');
    expect(paddleResult[0].text).toBe('패들결과');
    expect(luna.recognize).toHaveBeenCalledTimes(1);
    expect(paddle.recognize).toHaveBeenCalledTimes(1);
  });
});
