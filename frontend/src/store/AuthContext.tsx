import { setApiAccountToken } from '../lib/api'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  AuthApiError,
  changePassword as apiChangePassword,
  deleteAccount as apiDeleteAccount,
  fetchCurrentUser,
  loginWithGoogle as apiLoginWithGoogle,
  loginWithEmail as apiLoginWithEmail,
  loginWithNaver as apiLoginWithNaver,
  signupWithEmail as apiSignupWithEmail,
  updateProfile as apiUpdateProfile,
  type ProfileUpdate,
  type AuthUser,
} from '../lib/authApi'

const STORAGE_PREFIX = 'glocalizer:'
const TOKEN_KEY = `${STORAGE_PREFIX}authToken`
const USER_KEY = `${STORAGE_PREFIX}authUser`

function loadStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function loadStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

function persistSession(token: string | null, user: AuthUser | null) {
  try {
    if (token && user) {
      localStorage.setItem(TOKEN_KEY, token)
      localStorage.setItem(USER_KEY, JSON.stringify(user))
    } else {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
    }
  } catch {
    // localStorage 접근이 막힌 환경에서도 메모리 상의 로그인 상태는 유지된다.
  }
}

interface AuthState {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  loginWithEmail: (email: string, password: string) => Promise<void>
  signupWithEmail: (email: string, password: string, name?: string) => Promise<void>
  completeNaverLogin: (code: string, state: string) => Promise<void>
  completeGoogleLogin: (accessToken: string) => Promise<void>
  logout: () => void
  /** 저장된 토큰이 아직 유효한지 서버에 확인해 user 정보를 최신화한다. */
  refreshUser: () => Promise<void>
  updateProfile: (update: ProfileUpdate) => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
  deleteAccount: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(loadStoredToken)
  const [user, setUser] = useState<AuthUser | null>(loadStoredUser)

  useEffect(() => { setApiAccountToken(token) }, [token])

  const applySession = useCallback((nextToken: string, nextUser: AuthUser) => {
    setApiAccountToken(nextToken)
    setToken(nextToken)
    setUser(nextUser)
    persistSession(nextToken, nextUser)
  }, [])

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    const result = await apiLoginWithEmail(email, password)
    applySession(result.token, result.user)
  }, [applySession])

  const signupWithEmail = useCallback(async (email: string, password: string, name?: string) => {
    const result = await apiSignupWithEmail(email, password, name)
    applySession(result.token, result.user)
  }, [applySession])

  const completeNaverLogin = useCallback(async (code: string, state: string) => {
    const result = await apiLoginWithNaver(code, state)
    applySession(result.token, result.user)
  }, [applySession])

  const completeGoogleLogin = useCallback(async (accessToken: string) => {
    const result = await apiLoginWithGoogle(accessToken)
    applySession(result.token, result.user)
  }, [applySession])

  const logout = useCallback(() => {
    setApiAccountToken(null)
    setToken(null)
    setUser(null)
    persistSession(null, null)
  }, [])

  const refreshUser = useCallback(async () => {
    if (!token) return
    try {
      const { user: freshUser } = await fetchCurrentUser(token)
      setUser(freshUser)
      persistSession(token, freshUser)
    } catch (error) {
      // 토큰 만료/무효화 시에는 조용히 로그아웃 처리한다.
      if (error instanceof AuthApiError) {
        setApiAccountToken(null)
        setToken(null)
        setUser(null)
        persistSession(null, null)
      }
    }
  }, [token])

  useEffect(() => {
    if (!token) return

    void refreshUser()
    const refreshOnFocus = () => { void refreshUser() }
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void refreshUser()
    }

    window.addEventListener('focus', refreshOnFocus)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    return () => {
      window.removeEventListener('focus', refreshOnFocus)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [token, refreshUser])

  const updateProfile = useCallback(async (update: ProfileUpdate) => {
    if (!token) throw new AuthApiError('로그인이 필요해요.')
    const { user: nextUser } = await apiUpdateProfile(token, update)
    setUser(nextUser)
    persistSession(token, nextUser)
  }, [token])

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    if (!token) throw new AuthApiError('로그인이 필요해요.')
    await apiChangePassword(token, currentPassword, newPassword)
  }, [token])

  const deleteAccount = useCallback(async () => {
    if (!token) throw new AuthApiError('로그인이 필요해요.')
    await apiDeleteAccount(token)
    setApiAccountToken(null)
    setToken(null)
    setUser(null)
    persistSession(null, null)
  }, [token])

  const value = useMemo<AuthState>(() => ({
    user,
    token,
    isAuthenticated: Boolean(token && user),
    loginWithEmail,
    signupWithEmail,
    completeNaverLogin,
    completeGoogleLogin,
    logout,
    refreshUser,
    updateProfile,
    changePassword,
    deleteAccount,
  }), [user, token, loginWithEmail, signupWithEmail, completeNaverLogin, completeGoogleLogin, logout, refreshUser, updateProfile, changePassword, deleteAccount])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
