import { Loader2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Button from '../components/Button'
import NaverIcon from '../components/NaverIcon'
import GoogleIcon from '../components/GoogleIcon'
import { useToast } from '../components/Toast'
import { useSiteLang } from '../i18n/LanguageContext'
import { useAuth } from '../store/AuthContext'
import { buildNaverAuthUrl } from '../lib/naverAuth'
import { safeLoginReturn, rememberLoginReturn } from '../lib/loginReturn'
import { workflowCopy } from '../i18n/workflow'
import { preloadGoogleLogin, startGoogleLogin } from '../lib/googleAuth'

type Mode = 'login' | 'signup'

export default function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const returnTo = safeLoginReturn(searchParams.get('next'))
  const { t, lang } = useSiteLang()
  const w = workflowCopy[lang]
  const { loginWithEmail, signupWithEmail, completeGoogleLogin, isAuthenticated, checkingSession, sessionError, refreshUser } = useAuth()
  const toast = useToast()

  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [googlePreparing, setGooglePreparing] = useState(true)
  const [googleSubmitting, setGoogleSubmitting] = useState(false)

  useEffect(() => {
    let active = true
    preloadGoogleLogin()
      .catch(() => false)
      .finally(() => {
        if (active) setGooglePreparing(false)
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (isAuthenticated && !checkingSession && !sessionError) navigate(returnTo, { replace: true })
  }, [isAuthenticated, checkingSession, sessionError, navigate, returnTo])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      if (mode === 'login') {
        await loginWithEmail(email, password)
      } else {
        await signupWithEmail(email, password, name.trim() || undefined)
      }
      toast(t.loginSuccessToast, 'success')
      navigate(returnTo)
    } catch (err) {
      setError(err instanceof Error ? err.message : '요청에 실패했어요.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleNaverLogin = () => {
    const url = buildNaverAuthUrl()
    if (!url) {
      toast('네이버 로그인이 아직 설정되지 않았어요.')
      return
    }
    rememberLoginReturn(returnTo)
    window.location.href = url
  }

  const handleGoogleLogin = async () => {
    if (googleSubmitting) return
    setGoogleSubmitting(true)
    try {
      const accessToken = await startGoogleLogin()
      if (!accessToken) {
        toast(t.loginGoogleNotConfigured)
        return
      }
      await completeGoogleLogin(accessToken)
      toast(t.loginSuccessToast, 'success')
      navigate(returnTo)
    } catch (err) {
      toast(err instanceof Error ? err.message : t.loginGoogleFailed)
    } finally {
      setGoogleSubmitting(false)
    }
  }

  const inputClass =
    'h-12 w-full rounded-control border border-gray-200 bg-white px-4 text-[15px] font-medium text-ink outline-none transition-colors placeholder:text-sub focus:border-brand'

  if (checkingSession) return <div role="status" className="p-8 text-center">{w.checkingSession}</div>
  if (isAuthenticated && sessionError) return <div role="alert" className="mx-auto max-w-md p-8 text-center"><p>{w.sessionRetry}</p><Button className="mt-4" onClick={() => { void refreshUser() }}>{w.retry}</Button></div>

  return (
    <div className="flex min-h-screen flex-col bg-surface">

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-[420px] rounded-panel border border-gray-100 bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.06)] sm:p-8">
          <div className="text-center">
            <h1 className="text-[26px] font-extrabold text-ink">{t.loginTitle}</h1>
            <p className="mt-2 text-sm text-sub">{t.loginSubtitle}</p>
          </div>

          <div className="mt-6 flex rounded-panel bg-surface p-1">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null) }}
              className={`h-9 flex-1 rounded-control text-sm font-bold transition-colors ${
                mode === 'login' ? 'bg-white text-ink shadow-sm' : 'text-sub hover:text-ink'
              }`}
            >
              {t.loginTabLogin}
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(null) }}
              className={`h-9 flex-1 rounded-control text-sm font-bold transition-colors ${
                mode === 'signup' ? 'bg-white text-ink shadow-sm' : 'text-sub hover:text-ink'
              }`}
            >
              {t.loginTabSignup}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            {mode === 'signup' && (
              <label className="flex flex-col gap-1.5">
                <span className="text-[13px] font-bold text-ink">
                  {t.loginNameLabel} <span className="font-medium text-sub">{t.loginNameOptional}</span>
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={event => setName(event.target.value)}
                  placeholder={t.loginNamePlaceholder}
                  maxLength={60}
                  className={inputClass}
                />
              </label>
            )}

            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-bold text-ink">{t.loginEmailLabel}</span>
              <input
                type="email"
                value={email}
                onChange={event => setEmail(event.target.value)}
                placeholder={t.loginEmailPlaceholder}
                required
                autoComplete="email"
                className={inputClass}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-bold text-ink">{t.loginPasswordLabel}</span>
              <input
                type="password"
                value={password}
                onChange={event => setPassword(event.target.value)}
                placeholder={t.loginPasswordPlaceholder}
                required
                minLength={mode === 'signup' ? 8 : undefined}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className={inputClass}
              />
            </label>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] font-semibold text-red-600">{error}</p>
            )}

            <Button type="submit" size="lg" glow disabled={submitting} className="w-full">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === 'login' ? t.loginSubmitLogin : t.loginSubmitSignup}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-gray-100" />
            <span className="text-xs font-semibold text-sub">{t.loginDivider}</span>
            <span className="h-px flex-1 bg-gray-100" />
          </div>

          <div className="flex flex-col gap-3">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={handleGoogleLogin}
              disabled={googlePreparing || googleSubmitting}
              aria-busy={googlePreparing || googleSubmitting}
              className="w-full"
            >
              {googlePreparing || googleSubmitting
                ? <Loader2 className="h-5 w-5 animate-spin" />
                : <GoogleIcon className="h-5 w-5" />}
              {googlePreparing ? t.loginGooglePreparing : googleSubmitting ? t.loginGoogleProcessing : t.loginGoogleCta}
            </Button>
            <Button type="button" variant="naver" size="lg" onClick={handleNaverLogin} className="w-full">
              <NaverIcon className="h-[18px] w-[18px]" />
              {t.loginNaverCta}
            </Button>
          </div>

          <p className="mt-6 text-center text-[13px] font-semibold text-sub">
            <button
              type="button"
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null) }}
              className="text-brand-dark hover:underline"
            >
              {mode === 'login' ? t.loginSwitchToSignup : t.loginSwitchToLogin}
            </button>
          </p>
        </div>
      </main>
    </div>
  )
}
