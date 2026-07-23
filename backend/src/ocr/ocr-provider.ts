import { env } from '../config/env.js';
import { paddleOcrProvider } from './paddle/paddle-ocr.provider.js';
import type { OcrProvider } from './ocr-provider.types.js';

export function getOcrProvider(): OcrProvider {
  if (env.OCR_PROVIDER === 'paddle') return paddleOcrProvider;
  return paddleOcrProvider;
}
