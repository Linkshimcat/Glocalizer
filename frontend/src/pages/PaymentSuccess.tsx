import { useEffect, useState } from 'react'
import { Check, Loader2, X } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Button from '../components/Button'
import Footer from '../components/Footer'
import { useSiteLang } from '../i18n/LanguageContext'
import { confirmPayment } from '../lib/api'
import { requestErrorMessage } from '../lib/requestError'

const labels = {
  ko: { confirming: '결제를 확인하고 있어요…', doneTitle: '결제가 완료됐어요', doneDesc: '멤버십이 활성화됐어요. 바로 이용해보세요.', goDashboard: '워크스페이스로 이동', failTitle: '결제 확인에 실패했어요', goPricing: '요금제로 돌아가기' },
  en: { confirming: 'Confirming your payment…', doneTitle: 'Payment complete', doneDesc: 'Your membership is now active.', goDashboard: 'Go to workspace', failTitle: 'We couldn’t confirm the payment', goPricing: 'Back to plans' },
  ja: { confirming: '決済を確認しています…', doneTitle: '決済が完了しました', doneDesc: 'メンバーシップが有効になりました。', goDashboard: 'ワークスペースへ', failTitle: '決済の確認に失敗しました', goPricing: 'プランに戻る' },
  zh: { confirming: '正在确认付款…', doneTitle: '付款已完成', doneDesc: '会员已激活，快去使用吧。', goDashboard: '前往工作空间', failTitle: '付款确认失败', goPricing: '返回方案' },
}

export default function PaymentSuccess() {
  const { lang } = useSiteLang()
  const t = labels[lang]
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'confirming' | 'done' | 'error'>('confirming')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const paymentKey = searchParams.get('paymentKey')
    const orderId = searchParams.get('orderId')
    const amount = Number(searchParams.get('amount'))
    if (!paymentKey || !orderId || !Number.isFinite(amount)) {
      setStatus('error')
      return
    }
    let active = true
    confirmPayment({ paymentKey, orderId, amount })
      .then(() => { if (active) setStatus('done') })
      .catch((error: unknown) => {
        if (!active) return
        setErrorMessage(requestErrorMessage(error, lang, t.failTitle))
        setStatus('error')
      })
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex min-h-svh flex-col">
      <main id="main-content" tabIndex={-1} className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-10 text-center sm:py-20">
        {status === 'confirming' && <><Loader2 className="h-10 w-10 animate-spin text-brand" /><p className="font-medium text-sub">{t.confirming}</p></>}
        {status === 'done' && <>
          <span className="grid h-16 w-16 place-items-center rounded-full bg-brand-soft text-brand"><Check className="h-8 w-8" /></span>
          <div><h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t.doneTitle}</h1><p className="mt-2 font-medium text-sub">{t.doneDesc}</p></div>
          <Button size="lg" glow onClick={() => navigate('/dashboard')}>{t.goDashboard}</Button>
        </>}
        {status === 'error' && <>
          <span className="grid h-16 w-16 place-items-center rounded-full bg-red-100 text-red-600"><X className="h-8 w-8" /></span>
          <div><h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t.failTitle}</h1>{errorMessage && <p className="mt-2 font-medium text-sub">{errorMessage}</p>}</div>
          <Link to="/pricing" className="font-bold text-brand underline">{t.goPricing}</Link>
        </>}
      </main>
      <Footer />
    </div>
  )
}
