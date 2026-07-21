import { ERROR_CODES, type ErrorCode } from './error-codes.js';

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly details?: Record<string, unknown>;

  constructor(code: ErrorCode, details?: Record<string, unknown>, message?: string) {
    const definition = ERROR_CODES[code];
    super(message ?? definition.message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = definition.status;
    this.details = details;
  }
}

/**
 * catch(err) 블록에서 "AppError면 그 code/message를 쓰고, 아니면 폴백을 쓴다"는 패턴이
 * 파이프라인 단계마다(OCR/번역/이미지 정리/워커) 반복돼서 하나로 뽑았다.
 */
export function describeError(err: unknown, fallbackCode: ErrorCode, fallbackMessage: string): { code: ErrorCode; message: string } {
  if (err instanceof AppError) {
    return { code: err.code, message: err.message };
  }
  return { code: fallbackCode, message: fallbackMessage };
}
