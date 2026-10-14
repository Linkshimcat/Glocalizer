export interface FailurePayload {
  error?: { code?: string; message?: string }
  message?: string
}

/** Shared metadata without changing the existing auth error instanceof contract. */
export class RequestError extends Error {
  readonly status: number
  readonly code?: string
  readonly retryAfterSeconds?: number

  constructor(message: string, status = 0, code?: string, retryAfterSeconds?: number) {
    super(message)
    this.name = 'RequestError'
    this.status = status
    this.code = code
    this.retryAfterSeconds = retryAfterSeconds
  }
}

export function requestErrorMessage(error: unknown, lang: SiteLang, fallback: string): string {
  const copy = experienceCopy[lang]
  if (error instanceof RequestError) {
    if (error.code === 'REQUEST_TIMEOUT') return copy.requestTimeout
    if (error.status === 0) return copy.unavailable
    if (error.status === 429) return copy.rateLimited
    if (error.status >= 500) return copy.serverFailed
  }
  return error instanceof Error ? error.message : fallback
}

export async function responseFailure(response: Response, fallback: string) {
  const parsed: unknown = await response.json().catch(() => undefined)
  const body = parsed && typeof parsed === 'object' ? parsed as FailurePayload : {}
  const value = response.headers.get('retry-after')?.trim() ?? null
  const delay = value === null ? NaN : /^\d+(?:\.\d+)?$/.test(value)
    ? Number(value)
    : (Date.parse(value) - Date.now()) / 1000
  return {
    message: typeof body.error?.message === 'string' ? body.error.message : typeof body.message === 'string' ? body.message : fallback,
    status: response.status,
    code: typeof body.error?.code === 'string' ? body.error.code : undefined,
    retryAfterSeconds: Number.isFinite(delay) ? Math.max(0, Math.ceil(delay)) : undefined,
  }
}

/** Buffer the response under one deadline, including JSON/file body reads. Never retry mutations. */
export async function apiFetch(input: string, init?: RequestInit, timeoutMs = 120_000): Promise<Response> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(new DOMException('Request timed out', 'TimeoutError')), timeoutMs)
  const signal = init?.signal ? AbortSignal.any([init.signal, controller.signal]) : controller.signal
  try {
    const response = await fetch(input, { ...init, signal })
    const body = await response.arrayBuffer()
    signal.throwIfAborted()
    return new Response([204, 205, 304].includes(response.status) ? null : body, {
      status: response.status, statusText: response.statusText, headers: response.headers,
    })
  } catch (error) {
    if (init?.signal?.aborted) throw init.signal.reason
    if (controller.signal.aborted) throw new RequestError('요청 시간이 초과됐어요. 작업 상태를 확인한 뒤 다시 시도해주세요.', 0, 'REQUEST_TIMEOUT')
    if (error instanceof Error && error.name === 'AbortError') throw error
    throw new RequestError('서버에 연결하지 못했어요. 연결 상태를 확인한 뒤 다시 시도해주세요.', 0, 'NETWORK_FAILURE')
  } finally {
    window.clearTimeout(timeout)
  }
}
import { experienceCopy } from '../i18n/experience'
import type { SiteLang } from '../i18n/translations'
