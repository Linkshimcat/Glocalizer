import { logger } from '../config/logger.js';
import type { OcrProvider } from './ocr-provider.types.js';

export async function measureShadowOcr(provider: OcrProvider, assetId: string, variants: Buffer[]): Promise<void> {
  const startedAt = performance.now();
  try {
    const results = [];
    for (const variant of variants) results.push(await provider.recognize(variant));
    const regionCount = results.reduce((total, regions) => total + regions.length, 0);
    const koreanRegionCount = results.flat().filter((region) => /[\uAC00-\uD7A3]/.test(region.text)).length;
    logger.info({ assetId, provider: provider.name, variantCount: variants.length, regionCount, koreanRegionCount, durationMs: Math.round(performance.now() - startedAt) }, 'OCR shadow benchmark 완료');
  } catch (error) {
    logger.warn({ err: error, assetId, provider: provider.name, durationMs: Math.round(performance.now() - startedAt) }, 'OCR shadow benchmark 실패');
  }
}
