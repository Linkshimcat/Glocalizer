import { apiFetch, RequestError, responseFailure } from './requestError'
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1'

export interface AuthUser {
  id: string
  email: string | null
  name: string | null
  avatarUrl: string | null
  /** 이전 버전 localStorage에는 없을 수 있으며, 서버 동기화 후 채워진다. */
  signupMethod?: 'email' | 'naver' | 'google' | 'kakao'
  hasPassword?: boolean
  hasNaver?: boolean
  hasGoogle?: boolean
  hasKakao?: boolean
  securityEmailNotifications?: boolean
}

interface AuthResult {
  token: string
  user: AuthUser
}

export class AuthApiError extends RequestError {
  constructor(message: string, status = 0, code?: string, retryAfterSeconds?: number) {
    super(message, status, code, retryAfterSeconds)
    this.name = 'AuthApiError'
  }
}

async function authRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await apiFetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  })
  if (!response.ok) {
    const error = await responseFailure(response, '요청에 실패했어요.')
    throw new AuthApiError(error.message, error.status, error.code, error.retryAfterSeconds)
  }
  return response.json() as Promise<T>
}

const DEVICE_ID_KEY = 'glocalizer:deviceId'

function deviceHeaders(): Record<string, string> {
  try {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY)
    if (!deviceId && typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      deviceId = crypto.randomUUID()
      localStorage.setItem(DEVICE_ID_KEY, deviceId)
    }
    return deviceId ? { 'X-Glocalizer-Device-Id': deviceId } : {}
  } catch {
    return {}
  }
}

export function signupWithEmail(email: string, password: string, name?: string): Promise<AuthResult> {
  return authRequest<AuthResult>('/auth/signup', {
    method: 'POST',
    headers: deviceHeaders(),
    body: JSON.stringify({ email, password, name }),
  })
}

export function loginWithEmail(email: string, password: string): Promise<AuthResult> {
  return authRequest<AuthResult>('/auth/login', {
    method: 'POST',
    headers: deviceHeaders(),
    body: JSON.stringify({ email, password }),
  })
}

export function loginWithNaver(code: string, state: string): Promise<AuthResult> {
  return authRequest<AuthResult>('/auth/naver/callback', {
    method: 'POST',
    headers: deviceHeaders(),
    body: JSON.stringify({ code, state }),
  })
}

export function loginWithKakao(code: string, redirectUri: string): Promise<AuthResult> {
  return authRequest<AuthResult>('/auth/kakao/callback', {
    method: 'POST',
    headers: deviceHeaders(),
    body: JSON.stringify({ code, redirectUri }),
  })
}

export function loginWithGoogle(accessToken: string): Promise<AuthResult> {
  return authRequest<AuthResult>('/auth/google', {
    method: 'POST',
    headers: deviceHeaders(),
    body: JSON.stringify({ accessToken }),
  })
}

declare global {
  interface Window {
    /** index.html의 인라인 스크립트가 번들 로딩과 겹쳐 미리 보낸 /auth/me 요청. */
    __earlyMe?: { token: string; response: Promise<Response> }
  }
}

/** 미리 보낸 /auth/me 요청이 같은 토큰용이면 한 번만 꺼내 쓴다. */
function takeEarlySession(token: string): Promise<Response> | null {
  const early = window.__earlyMe
  window.__earlyMe = undefined
  return early && early.token === token ? early.response : null
}

export async function fetchCurrentUser(token: string): Promise<{ user: AuthUser }> {
  const early = takeEarlySession(token)
  if (early) {
    try {
      const response = await early
      if (response.ok) return await response.json() as { user: AuthUser }
    } catch {
      // 미리 보낸 요청이 실패했거나 거절됐다면 아래에서 평소처럼 다시 확인해 오류 처리를 그대로 둔다.
    }
  }
  return authRequest<{ user: AuthUser }>('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export interface ProfileUpdate {
  name?: string
  /** data URL. null이면 기본 이미지로 되돌린다. */
  avatar?: string | null
}

export function updateProfile(token: string, update: ProfileUpdate): Promise<{ user: AuthUser }> {
  return authRequest<{ user: AuthUser }>('/auth/me', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(update),
  })
}

export function updateEmailPreferences(token: string, securityEmailNotifications: boolean): Promise<{ user: AuthUser }> {
  return authRequest<{ user: AuthUser }>('/auth/me/email-preferences', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ securityEmailNotifications }),
  })
}

export function changePassword(token: string, currentPassword: string, newPassword: string): Promise<{ success: true }> {
  return authRequest<{ success: true }>('/auth/me/password', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ currentPassword, newPassword }),
  })
}

export function deleteAccount(token: string): Promise<{ success: true }> {
  return authRequest<{ success: true }>('/auth/me', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}

export interface AuthSession {
  /** 이전 방식 토큰으로 로그인한 현재 기기는 'legacy'. */
  id: string
  deviceLabel: string | null
  ipMasked: string | null
  loginMethod: 'email' | 'naver' | 'google'
  createdAt: string
  lastSeenAt: string
  current: boolean
  legacy?: boolean
}

export function listSessions(token: string): Promise<{ sessions: AuthSession[] }> {
  return authRequest<{ sessions: AuthSession[] }>('/auth/sessions', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function revokeSession(token: string, sessionId: string): Promise<{ success: true }> {
  return authRequest<{ success: true }>(`/auth/sessions/${encodeURIComponent(sessionId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}

/** 이 기기를 뺀 모든 기기를 로그아웃한다. 이 기기가 계속 쓸 새 토큰을 돌려준다. */
export function revokeOtherSessions(token: string): Promise<AuthResult> {
  return authRequest<AuthResult>('/auth/sessions/revoke-others', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
}

/** 서버에서 이 기기의 세션을 폐기한다. 실패해도 로컬 로그아웃은 진행하므로 호출하는 쪽이 오류를 무시한다. */
export function serverLogout(token: string): Promise<{ success: true }> {
  return authRequest<{ success: true }>('/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
}

export type FeedbackCategory = 'bug' | 'feature' | 'other'

export function submitFeedback(token: string, category: FeedbackCategory, message: string): Promise<{ issueUrl: string }> {
  return authRequest<{ issueUrl: string }>('/feedback', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ category, message }),
  })
}
