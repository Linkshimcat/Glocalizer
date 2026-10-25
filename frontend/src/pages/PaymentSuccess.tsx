import { useEffect, useRef, useState } from 'react'
import { Check, Loader2, X } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Button from '../components/Button'
import Footer from '../components/Footer'
import { useSiteLang } from '../i18n/LanguageContext'
import { confirmPayment } from '../lib/api'
import { requestErrorMessage, RequestError } from '../lib/requestError'

const labels = {
  ko: { confirming: '테스트 결제를 확인하고 있어요…', doneTitle: '테스트 결제가 완료됐어요', doneDesc: '실제 청구 없이 멤버십 테스트 이용이 활성화됐어요.', goDashboard: '워크스페이스로 이동', failTitle: '결제 확인을 마치지 못했어요', goPricing: '요금제로 돌아가기', retry: '승인 확인 다시 시도', test: 'TossPayments 테스트 결제 · 실제 결제나 청구는 발생하지 않습니다.' },
  en: { confirming: 'Confirming your test payment…', doneTitle: 'Test payment complete', doneDesc: 'Your test membership is active. No real charge was made.', goDashboard: 'Go to workspace', failTitle: 'We couldn’t finish confirming the payment', goPricing: 'Back to plans', retry: 'Retry approval check', test: 'TossPayments test mode · No real payment or charge occurs.' },
  ja: { confirming: 'テスト決済を確認しています…', doneTitle: 'テスト決済が完了しました', doneDesc: '実際の請求なしでメンバーシップのテスト利用が有効になりました。', goDashboard: 'ワークスペースへ', failTitle: '決済確認を完了できませんでした', goPricing: 'プランに戻る', retry: '承認確認を再試行', test: 'TossPaymentsテスト決済 · 実際の決済・請求は発生しません。' },
  zh: { confirming: '正在确认测试付款…', doneTitle: '测试付款已完成', doneDesc: '测试会员已启用，不会产生真实扣款。', goDashboard: '前往工作空间', failTitle: '未能完成付款确认', goPricing: '返回方案', retry: '重试付款确认', test: 'TossPayments 测试模式 · 不会产生真实付款或扣款。' },
}

export default function PaymentSuccess() {
  const { lang } = useSiteLang()
  const t = labels[lang]
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'confirming' | 'done' | 'error'>('confirming')
  const [attempt, setAttempt] = useState(0)
  const [canRetry, setCanRetry] = useState(false)
  const resultRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => { if (status !== 'confirming') resultRef.current?.focus() }, [status])
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const paymentKey = searchParams.get('paymentKey')
    const orderId = searchParams.get('orderId')
    const amount = Number(searchParams.get('amount'))
    if (!paymentKey || !orderId || !Number.isSafeInteger(amount) || amount <= 0) {
      setStatus('error')
      return
    }
    let active = true
    confirmPayment({ paymentKey, orderId, amount })
      .then(() => { if (active) setStatus('done') })
      .catch((error: unknown) => {
        if (!active) return
        setErrorMessage(requestErrorMessage(error, lang, t.failTitle))
        setCanRetry(!(error instanceof RequestError) || error.code === 'PAYMENT_CONFIRM_IN_PROGRESS' || error.status === 0 || error.status >= 500)
        setStatus('error')
      })
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt])

  return (
    <div className="flex min-h-svh flex-col">
      <main id="main-content" tabIndex={-1} className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-10 text-center sm:py-20">
        <p className="payment-test-notice" role="note">{t.test}</p>
        {status === 'confirming' && <><Loader2 className="h-10 w-10 animate-spin text-brand" /><p role="status" className="font-medium text-sub">{t.confirming}</p></>}
        {status === 'done' && <>
          <span className="grid h-16 w-16 place-items-center rounded-full bg-brand-soft text-brand"><Check className="h-8 w-8" /></span>
          <div><h1 ref={resultRef} tabIndex={-1} className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t.doneTitle}</h1><p className="mt-2 font-medium text-sub">{t.doneDesc}</p></div>
          <Button size="lg" glow onClick={() => navigate('/dashboard')}>{t.goDashboard}</Button>
        </>}
        {status === 'error' && <>
          <span className="grid h-16 w-16 place-items-center rounded-full bg-red-100 text-red-600"><X className="h-8 w-8" /></span>
          <div><h1 ref={resultRef} tabIndex={-1} className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t.failTitle}</h1>{errorMessage && <p className="mt-2 font-medium text-sub">{errorMessage}</p>}</div>
          {canRetry && <Button size="lg" onClick={() => { setStatus('confirming'); setCanRetry(false); setAttempt(value => value + 1) }}>{t.retry}</Button>}
          <Link to="/pricing" className="font-bold text-brand underline">{t.goPricing}</Link>
        </>}
      </main>
      <Footer />
    </div>
  )
}
