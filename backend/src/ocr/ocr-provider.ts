import { env } from '../config/env.js';
import { openVinoNpuProvider } from './openvino/openvino-npu.provider.js';
import { paddleOcrProvider } from './paddle/paddle-ocr.provider.js';
import type { OcrProvider } from './ocr-provider.types.js';

export function getOcrProvider(): OcrProvider {
  if (env.OCR_PROVIDER === 'openvino-npu') return openVinoNpuProvider;
  if (env.OCR_PROVIDER === 'paddle') return paddleOcrProvider;
  return paddleOcrProvider;
}

export function getShadowOcrProvider(): OcrProvider | null {
  return env.OCR_SHADOW_PROVIDER === 'openvino-npu' ? openVinoNpuProvider : null;
}
