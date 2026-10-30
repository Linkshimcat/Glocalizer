import { Loader2 } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { useSiteLang } from '../i18n/LanguageContext'
import { accountCopy } from '../i18n/account'
import type { VerificationProof, VerificationPurpose } from '../lib/authApi'
import { requestErrorMessage } from '../lib/requestError'
import { useAuth } from '../store/AuthContext'
import { useToast } from './Toast'

const RESEND_SECONDS = 60

/** 계정 이메일로 6자리 코드를 받아 입력하는 칸. 서버가 준 챌린지와 6자리가 모두 갖춰지면 onProofChange로 알리고,
 *  아니면 null을 알린다. 칸이 사라지면(모달·폼 닫힘) 상태도 함께 사라져 다음에 열 때 새 코드를 받는다. */
export default function VerificationCodeField({ purpose, onProofChange, disabled = false }: {
  purpose: VerificationPurpose
  onProofChange: (proof: VerificationProof | null) => void
  disabled?: boolean
}) {
  const { requestVerificationCode } = useAuth()
  const { lang } = useSiteLang()
  const t = accountCopy(lang)
  const toast = useToast()
  const inputId = useId()
  const [challenge, setChallenge] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState('')
  const [code, setCode] = useState('')
  const [sending, setSending] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown(seconds => seconds - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  useEffect(() => {
    onProofChange(challenge && /^\d{6}$/.test(code) ? { challenge, code } : null)
  }, [challenge, code, onProofChange])

  const send = async () => {
    setSending(true)
    try {
      const result = await requestVerificationCode(purpose)
      setChallenge(result.challenge)
      setSentTo(result.sentTo)
      setCode('')
      setCooldown(RESEND_SECONDS)
    } catch (error) {
      toast(requestErrorMessage(error, lang, t.accountCodeSendFailed))
    } finally {
      setSending(false)
    }
  }

  return (
    <div>
      <label htmlFor={inputId} className="text-sm font-semibold text-sub">{t.accountCodeLabel}</label>
      <div className="mt-2 flex gap-2">
        <input
          id={inputId}
          value={code}
          // maxLength를 두지 않는다. "123 456"처럼 붙여 넣으면 공백 때문에 숫자가 잘리므로, 숫자만 남긴 뒤 6자리로 자른다.
          onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="000000"
          disabled={disabled || !challenge}
          className="min-w-0 flex-1 rounded-control border border-gray-200 px-4 py-3 text-base font-bold tracking-[0.3em] text-ink outline-none transition-colors focus:border-brand disabled:bg-surface disabled:opacity-60"
        />
        <button
          type="button"
          onClick={() => { void send() }}
          disabled={disabled || sending || cooldown > 0}
          className="flex shrink-0 items-center gap-1.5 rounded-control border border-gray-200 px-4 text-sm font-bold text-ink transition-colors hover:bg-surface disabled:opacity-50"
        >
          {sending && <Loader2 className="h-4 w-4 animate-spin" />}
          {cooldown > 0 ? t.accountCodeResendIn.replace('{s}', String(cooldown)) : challenge ? t.accountCodeResend : t.accountCodeSend}
        </button>
      </div>
      {challenge && <p className="mt-2 text-xs text-sub" aria-live="polite">{t.accountCodeSent.replace('{email}', sentTo)}</p>}
    </div>
  )
}
