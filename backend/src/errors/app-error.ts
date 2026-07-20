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
