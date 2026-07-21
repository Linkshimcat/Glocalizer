import { env } from '../../config/env.js';
import { AppError } from '../../errors/app-error.js';
import type { ErrorCode } from '../../errors/error-codes.js';

interface PostJsonOptions {
  url: string;
  apiKey: string;
  body: unknown;
  errorCode: ErrorCode;
  /** 에러 메시지에 들어갈 호출 대상 이름. 예: "NVIDIA LLM", "Nemotron OCR" */
  errorLabel: string;
}

/**
 * nvidia-llm.client.ts와 nvidia-ocr.client.ts가 공유하는 HTTP 호출부.
 * AbortController 타임아웃(NVIDIA_REQUEST_TIMEOUT_MS)과 공통 에러 변환만 책임진다 —
 * 재시도 여부(withRetry)는 호출부가 결정한다.
 */
export async function postJsonToNvidia<T>(options: PostJsonOptions): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.NVIDIA_REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(options.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(options.body),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new AppError(
        options.errorCode,
        { timeoutMs: env.NVIDIA_REQUEST_TIMEOUT_MS },
        `${options.errorLabel} 요청이 ${env.NVIDIA_REQUEST_TIMEOUT_MS / 1000}초 안에 응답하지 않았습니다.`,
      );
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new AppError(
      options.errorCode,
      { status: response.status, body: body.slice(0, 500) },
      `${options.errorLabel} 요청이 실패했습니다 (status ${response.status}).`,
    );
  }

  return (await response.json()) as T;
}

/** 5xx나 타임아웃처럼 다시 시도할 가치가 있는 실패만 재시도한다. */
export function shouldRetryNvidiaError(err: unknown): boolean {
  if (!(err instanceof AppError)) return true;
  if (err.details?.timeoutMs !== undefined) return true;
  return typeof err.details?.status === 'number' && err.details.status >= 500;
}
