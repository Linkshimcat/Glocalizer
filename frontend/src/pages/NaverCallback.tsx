import { AlertTriangle, Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Button from '../components/Button'
import { useToast } from '../components/Toast'
import { useSiteLang } from '../i18n/LanguageContext'
import { loginCopy } from '../i18n/login'
import { consumeLoginReturn } from '../lib/loginReturn'
import { consumeNaverState } from '../lib/naverAuth'
import { useAuth } from '../store/AuthContext'

export default function NaverCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { lang } = useSiteLang()
  const t = loginCopy(lang)
  const { completeNaverLogin } = useAuth()
  const toast = useToast()
  const [error, setError] = useState<string | null>(null)
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const deniedByUser = searchParams.get('error')

    if (deniedByUser || !code || !state || !consumeNaverState(state)) {
      setError(t.loginNaverFailed)
      return
    }

    completeNaverLogin(code, state)
      .then(() => {
        toast(t.loginSuccessToast, 'success')
        navigate(consumeLoginReturn(), { replace: true })
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : t.loginNaverFailed)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <main id="main-content" tabIndex={-1} className="ui-recovery-page">
      <div className="w-full max-w-[360px] rounded-panel border border-gray-100 bg-white p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.06)]">
        {error ? (
          <>
            <AlertTriangle className="mx-auto h-8 w-8 text-red-500" />
            <h1 role="alert" className="mt-4 text-base font-bold text-ink">{error}</h1>
            <Button
              type="button"
              variant="secondary"
              size="md"
              className="mt-6 w-full"
              onClick={() => navigate('/login', { replace: true })}
            >
              {t.loginNaverBack}
            </Button>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand" />
            <h1 role="status" className="mt-4 text-base font-bold text-sub">{t.loginNaverProcessing}</h1>
          </>
        )}
      </div>
    </main>
  )
}
