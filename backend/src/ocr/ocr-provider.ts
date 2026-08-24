import { env } from '../config/env.js';
import { lunaOcrProvider } from './luna/luna-ocr.provider.js';
import { openVinoNpuProvider } from './openvino/openvino-npu.provider.js';
import { paddleOcrProvider } from './paddle/paddle-ocr.provider.js';
import type { OcrProvider } from './ocr-provider.types.js';

export function getOcrProvider(): OcrProvider {
  if (env.OCR_PROVIDER === 'openvino-npu') return openVinoNpuProvider;
  if (env.OCR_PROVIDER === 'luna') return lunaOcrProvider;
  if (env.OCR_PROVIDER === 'paddle') return paddleOcrProvider;
  return paddleOcrProvider;
}

export function getShadowOcrProvider(): OcrProvider | null {
  return env.OCR_SHADOW_PROVIDER === 'openvino-npu' ? openVinoNpuProvider : null;
}

/**
 * 유료 Vision API(Luna)가 실패하거나 한글을 전혀 찾지 못했을 때만 쓰는 로컬 백업.
 * PaddleOCR 자체가 주력일 때는 별도 fallback 없이 기존 variant 앙상블로 보완한다.
 */
export function getOcrFallbackProvider(): OcrProvider | null {
  return env.OCR_PROVIDER === 'luna' ? paddleOcrProvider : null;
}
