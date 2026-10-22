import { createHash } from 'node:crypto';
import type { OcrProvider, RecognizedRegion } from './ocr-provider.types.js';

const MAX_ENTRIES = 300;
const cache = new Map<string, RecognizedRegion[]>();

function keyFor(providerName: string, image: Buffer): string {
  return `${providerName}:${createHash('sha256').update(image).digest('hex')}`;
}

/**
 * 같은 이미지 바이트에 대한 OCR provider 호출 결과를 재사용한다. retryFailedAsset이
 * OCR 이후 단계(클린업·번역 등) 실패로 asset을 처음부터 다시 돌릴 때, 바뀐 게 없는
 * 이미지에 대해 유료 Vision API(Luna)를 또 호출하지 않게 하는 게 목적이다.
 * provider 이름까지 키에 포함해 Luna/Paddle 결과가 서로 섞이지 않게 한다.
 */
export async function recognizeWithCache(provider: OcrProvider, image: Buffer): Promise<RecognizedRegion[]> {
  const key = keyFor(provider.name, image);
  const cached = cache.get(key);
  if (cached) return cached;
  const result = await provider.recognize(image);
  if (cache.size >= MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) cache.delete(oldestKey);
  }
  cache.set(key, result);
  return result;
}

/** 테스트에서만 쓴다 — 캐시 상태가 다른 테스트로 새지 않게 리셋한다. */
export function clearOcrRecognitionCacheForTests(): void {
  cache.clear();
}
