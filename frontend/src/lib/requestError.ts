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

/** Never retry a mutation here; callers reconcile paid jobs explicitly. */
export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  try { return await fetch(input, init) }
  catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error
    throw new RequestError('서버에 연결하지 못했어요. 연결 상태를 확인한 뒤 다시 시도해주세요.', 0, 'NETWORK_FAILURE')
  }
}
import { experienceCopy } from '../i18n/experience'
import type { SiteLang } from '../i18n/translations'
