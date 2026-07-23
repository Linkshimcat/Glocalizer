import type { OcrProvider } from './ocr-provider.types.js';

export function selectOcrVariantCount(provider: Pick<OcrProvider, 'name'>, availableCount: number): number {
  return provider.name === 'openvino-npu' ? Math.min(1, availableCount) : availableCount;
}
