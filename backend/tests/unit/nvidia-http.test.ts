import { describe, expect, it } from 'vitest';
import { shouldRetryNvidiaError } from '../../src/ai/nvidia/nvidia-http.js';
import { AppError } from '../../src/errors/app-error.js';

describe('shouldRetryNvidiaError', () => {
  it('AppError가 아닌 예외(네트워크 오류 등)는 재시도한다', () => {
    expect(shouldRetryNvidiaError(new TypeError('fetch failed'))).toBe(true);
  });

  it('타임아웃으로 인한 AppError는 재시도한다', () => {
    const err = new AppError('NEMOTRON_OCR_FAILED', { timeoutMs: 300_000 });
    expect(shouldRetryNvidiaError(err)).toBe(true);
  });

  it('5xx 상태 코드는 재시도한다', () => {
    const err = new AppError('NEMOTRON_OCR_FAILED', { status: 503 });
    expect(shouldRetryNvidiaError(err)).toBe(true);
  });

  it('4xx 상태 코드는 재시도하지 않는다', () => {
    const err = new AppError('NEMOTRON_OCR_FAILED', { status: 422 });
    expect(shouldRetryNvidiaError(err)).toBe(false);
  });

  it('status/timeoutMs 정보가 전혀 없는 AppError는 재시도하지 않는다', () => {
    const err = new AppError('NEMOTRON_OCR_FAILED');
    expect(shouldRetryNvidiaError(err)).toBe(false);
  });
});
