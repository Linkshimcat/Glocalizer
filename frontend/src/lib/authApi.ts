const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1'

export interface AuthUser {
  id: string
  email: string | null
  name: string | null
  avatarUrl: string | null
  /** 이전 버전 localStorage에는 없을 수 있으며, 서버 동기화 후 채워진다. */
  signupMethod?: 'email' | 'naver' | 'google'
}

interface AuthResult {
  token: string
  user: AuthUser
}

interface ApiFailure {
  error?: { message?: string }
  message?: string
}

export class AuthApiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthApiError'
  }
}

async function authRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiFailure
    throw new AuthApiError(body.error?.message ?? body.message ?? '요청에 실패했어요.')
  }
  return response.json() as Promise<T>
}

export function signupWithEmail(email: string, password: string, name?: string): Promise<AuthResult> {
  return authRequest<AuthResult>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  })
}

export function loginWithEmail(email: string, password: string): Promise<AuthResult> {
  return authRequest<AuthResult>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function loginWithNaver(code: string, state: string): Promise<AuthResult> {
  return authRequest<AuthResult>('/auth/naver/callback', {
    method: 'POST',
    body: JSON.stringify({ code, state }),
  })
}

export function loginWithGoogle(accessToken: string): Promise<AuthResult> {
  return authRequest<AuthResult>('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ accessToken }),
  })
}

export function fetchCurrentUser(token: string): Promise<{ user: AuthUser }> {
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
