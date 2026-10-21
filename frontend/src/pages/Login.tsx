import { requestErrorMessage } from '../lib/requestError'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import AuthBackdrop from '../components/AuthBackdrop'
import Button from '../components/Button'
import StateNotice from '../components/StateNotice'
import NaverIcon from '../components/NaverIcon'
import GoogleIcon from '../components/GoogleIcon'
import { useToast } from '../components/Toast'
import { useSiteLang } from '../i18n/LanguageContext'
import { loginCopy } from '../i18n/login'
import { useAuth } from '../store/AuthContext'
import { buildNaverAuthUrl } from '../lib/naverAuth'
import { safeLoginReturn, rememberLoginReturn } from '../lib/loginReturn'
import { workflowCopy } from '../i18n/workflow'
import { preloadGoogleLogin, startGoogleLogin } from '../lib/googleAuth'
import { legalUi } from '../i18n/legalUi'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import '../login.css'

type Mode = 'login' | 'signup'

export default function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const returnTo = safeLoginReturn(searchParams.get('next'))
  const { lang } = useSiteLang()
  const t = loginCopy(lang)
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
  const [showPassword, setShowPassword] = useState(false)
  // 회원가입은 약관·개인정보처리방침 동의가 있어야 진행한다 (이메일·구글·네이버 모두).
  const [consent, setConsent] = useState(false)
  const consentRef = useRef<HTMLInputElement>(null)
  const busy = submitting || googleSubmitting
  const legal = legalUi[lang]
  useDocumentMeta(mode === 'login' ? t.loginTitle : t.loginTabSignup, mode === 'login' ? t.loginSubtitle : t.loginSignupSubtitle)

  const switchMode = (nextMode: Mode) => {
    setMode(nextMode)
    setError(null)
    setShowPassword(false)
    setConsent(false)
  }

  /** 가입 탭에서 동의하지 않았다면 안내하고 체크박스로 포커스를 옮긴다. */
  const requireConsent = () => {
    if (mode !== 'signup' || consent) return true
    setError(t.loginConsentRequired)
    consentRef.current?.focus()
    return false
  }

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
    if (!requireConsent()) return
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
      setError(requestErrorMessage(err, lang, w.sessionRetry))
    } finally {
      setSubmitting(false)
    }
  }

  const handleNaverLogin = () => {
    if (!requireConsent()) return
    const url = buildNaverAuthUrl()
    if (!url) {
      toast(t.loginNaverNotConfigured)
      return
    }
    rememberLoginReturn(returnTo)
    window.location.href = url
  }

  const handleGoogleLogin = async () => {
    if (googleSubmitting || !requireConsent()) return
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
      toast(requestErrorMessage(err, lang, t.loginGoogleFailed))
    } finally {
      setGoogleSubmitting(false)
    }
  }

  if (checkingSession) return <main id="main-content" tabIndex={-1} role="status" className="ui-recovery-page">{w.checkingSession}</main>
  if (isAuthenticated && sessionError) return <main id="main-content" tabIndex={-1} className="ui-recovery-page"><h1 className="page-title">{t.loginTitle}</h1><StateNotice error className="mt-5" action={<Button onClick={() => { void refreshUser() }}>{w.retry}</Button>}>{w.sessionRetry}</StateNotice></main>

  return (
    <div className="studio-login">
      <main id="main-content" tabIndex={-1} className="login-stage">
        <AuthBackdrop />
        <div className="login-content">
          <section className="login-panel" aria-labelledby="login-title">
            <div className="login-heading">
              <h1 id="login-title">{mode === 'login' ? t.loginTitle : t.loginTabSignup}</h1>
              <p>{mode === 'login' ? t.loginSubtitle : t.loginSignupSubtitle}</p>
            </div>

            <div className="login-mode">
              <button
                type="button"
                aria-pressed={mode === 'login'}
                disabled={busy}
                onClick={() => switchMode('login')}
              >
                {t.loginTabLogin}
              </button>
              <button
                type="button"
                aria-pressed={mode === 'signup'}
                disabled={busy}
                onClick={() => switchMode('signup')}
              >
                {t.loginTabSignup}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="login-form" aria-labelledby="login-title" aria-busy={submitting}>
              {mode === 'signup' && (
                <label className="login-field" htmlFor="login-name">
                  <span>
                    {t.loginNameLabel} <small>{t.loginNameOptional}</small>
                  </span>
                  <input
                    id="login-name"
                    name="name"
                    type="text"
                    value={name}
                    onChange={event => setName(event.target.value)}
                    placeholder={t.loginNamePlaceholder}
                    maxLength={60}
                    autoComplete="nickname"
                    disabled={busy}
                    className="login-input"
                  />
                </label>
              )}

              <label className="login-field" htmlFor="login-email">
                <span>{t.loginEmailLabel}</span>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  placeholder={t.loginEmailPlaceholder}
                  required
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  inputMode="email"
                  disabled={busy}
                  aria-describedby={error ? 'login-error' : undefined}
                  className="login-input"
                />
              </label>

              <div className="login-field">
                <label htmlFor="login-password" className="login-password-label">{t.loginPasswordLabel}</label>
                <div className="login-password">
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                    placeholder={t.loginPasswordPlaceholder}
                    required
                    minLength={mode === 'signup' ? 8 : undefined}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    disabled={busy}
                    aria-describedby={error ? 'login-error' : undefined}
                    className="login-input"
                  />
                  <button
                    type="button"
                    className="login-password-toggle"
                    aria-label={showPassword ? t.loginHidePassword : t.loginShowPassword}
                    aria-pressed={showPassword}
                    aria-controls="login-password"
                    disabled={busy}
                    onClick={() => setShowPassword(value => !value)}
                  >{showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</button>
                </div>
              </div>

              {mode === 'signup' && (
                <label className="login-consent" htmlFor="login-consent">
                  <input
                    id="login-consent"
                    ref={consentRef}
                    name="consent"
                    type="checkbox"
                    checked={consent}
                    onChange={event => {
                      setConsent(event.target.checked)
                      if (event.target.checked && error === t.loginConsentRequired) setError(null)
                    }}
                    required
                    disabled={busy}
                    aria-describedby={error ? 'login-error' : undefined}
                  />
                  <span>
                    {t.loginConsentBefore}
                    <Link to="/terms" target="_blank" rel="noopener noreferrer">{t.loginConsentTerms}</Link>
                    {t.loginConsentBetween}
                    <Link to="/privacy" target="_blank" rel="noopener noreferrer">{t.loginConsentPrivacy}</Link>
                    {t.loginConsentAfter}
                  </span>
                </label>
              )}

              {error && (
                <div id="login-error"><StateNotice error>{error}</StateNotice></div>
              )}

              <Button type="submit" size="lg" disabled={busy} aria-busy={submitting} className="login-submit">
                {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {submitting ? (mode === 'login' ? t.loginSubmitting : t.signupSubmitting) : (mode === 'login' ? t.loginSubmitLogin : t.loginSubmitSignup)}
              </Button>
            </form>

            <div className="login-divider">{t.loginDivider}</div>

            <div className="login-providers">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={handleGoogleLogin}
                disabled={googlePreparing || busy}
                aria-busy={googlePreparing || googleSubmitting}
                className="login-provider"
              >
                {googlePreparing || googleSubmitting
                  ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                  : <GoogleIcon className="h-5 w-5" />}
                {googlePreparing ? t.loginGooglePreparing : googleSubmitting ? t.loginGoogleProcessing : t.loginGoogleCta}
              </Button>
              <Button type="button" variant="outline" size="lg" onClick={handleNaverLogin} disabled={busy} className="login-provider login-provider--naver">
                <NaverIcon className="h-[18px] w-[18px]" />
                {t.loginNaverCta}
              </Button>
            </div>

            <div className="login-switch">
              <button
                type="button"
                disabled={busy}
                onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
              >
                {mode === 'login' ? t.loginSwitchToSignup : t.loginSwitchToLogin}
              </button>
            </div>
          </section>
          <nav className="login-links" aria-label={legal.footerLinks}>
            <Link to="/">{t.loginBackHome}</Link>
            <Link to="/privacy">{legal.privacy}</Link>
            <Link to="/terms">{legal.terms}</Link>
          </nav>
        </div>
      </main>
    </div>
  )
}
