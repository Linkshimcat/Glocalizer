import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Check, Globe2, Loader2, ReceiptText, ShieldCheck, X } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Button from '../components/Button'
import Footer from '../components/Footer'
import { useSiteLang } from '../i18n/LanguageContext'
import { confirmPayment } from '../lib/api'
import { requestErrorMessage, RequestError } from '../lib/requestError'

const labels = {
  ko: {
    testBadge: 'TossPayments 테스트 결제', confirming: '테스트 결제를 확인하고 있어요…',
    doneTitle: '테스트 결제가 완료됐어요', doneDesc: '실제 청구 없이 멤버십 테스트 이용이 활성화됐어요.',
    receipt: '결제 내역', amount: '결제 금액', period: '이용 기간', periodValue: '승인일로부터 30일',
    order: '주문번호', status: '처리 상태', done: '완료', testNote: '테스트 결제이며 실제 청구가 발생하지 않습니다.',
    goDashboard: '워크스페이스로 이동', goPricing: '요금제로 돌아가기', retry: '승인 확인 다시 시도',
    failTitle: '결제 확인을 마치지 못했어요', failDesc: '결제 상태를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.',
  },
  en: {
    testBadge: 'TossPayments test payment', confirming: 'Confirming your test payment…',
    doneTitle: 'Test payment complete', doneDesc: 'Your test membership is active. No real charge was made.',
    receipt: 'Payment details', amount: 'Amount', period: 'Access period', periodValue: '30 days from approval',
    order: 'Order number', status: 'Status', done: 'Complete', testNote: 'This is a test payment. No real charge will occur.',
    goDashboard: 'Go to workspace', goPricing: 'Back to plans', retry: 'Retry approval check',
    failTitle: 'We couldn’t finish confirming the payment', failDesc: 'We could not verify the payment status. Please try again shortly.',
  },
  ja: {
    testBadge: 'TossPaymentsテスト決済', confirming: 'テスト決済を確認しています…',
    doneTitle: 'テスト決済が完了しました', doneDesc: '実際の請求なしでメンバーシップのテスト利用が有効になりました。',
    receipt: '決済内容', amount: '決済金額', period: '利用期間', periodValue: '承認日から30日間',
    order: '注文番号', status: '処理状態', done: '完了', testNote: 'テスト決済です。実際の請求は発生しません。',
    goDashboard: 'ワークスペースへ', goPricing: 'プランに戻る', retry: '承認確認を再試行',
    failTitle: '決済確認を完了できませんでした', failDesc: '決済状態を確認できませんでした。しばらくしてから再試行してください。',
  },
  zh: {
    testBadge: 'TossPayments 测试付款', confirming: '正在确认测试付款…',
    doneTitle: '测试付款已完成', doneDesc: '测试会员已启用，不会产生真实扣款。',
    receipt: '付款详情', amount: '付款金额', period: '使用期限', periodValue: '付款批准后30天',
    order: '订单号', status: '处理状态', done: '已完成', testNote: '这是测试付款，不会产生真实扣款。',
    goDashboard: '前往工作空间', goPricing: '返回方案', retry: '重试付款确认',
    failTitle: '未能完成付款确认', failDesc: '无法确认付款状态。请稍后重试。',
  },
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
  const [errorMessage, setErrorMessage] = useState('')
  const paymentKey = searchParams.get('paymentKey')
  const orderId = searchParams.get('orderId') ?? ''
  const amount = Number(searchParams.get('amount'))
  const hasPaymentDetails = Boolean(orderId && Number.isSafeInteger(amount) && amount > 0)
  const formattedAmount = useMemo(() => {
    if (!hasPaymentDetails) return '-'
    const locale = lang === 'ko' ? 'ko-KR' : lang === 'ja' ? 'ja-JP' : lang === 'zh' ? 'zh-CN' : 'en-US'
    return `${new Intl.NumberFormat(locale).format(amount)}${lang === 'ko' ? '원' : ' KRW'}`
  }, [amount, hasPaymentDetails, lang])
  const displayOrderId = orderId.length > 24 ? `${orderId.slice(0, 20)}…` : orderId

  useEffect(() => { if (status !== 'confirming') resultRef.current?.focus() }, [status])

  useEffect(() => {
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
    <div className="payment-result-page">
      <div className={`payment-result-shell payment-result-${status}`}>
        <div className="payment-result-topbar">
          <Link className="payment-result-back" to="/pricing"><ArrowLeft size={16} aria-hidden="true" />{t.goPricing}</Link>
          <span className="payment-result-topbar-label">{t.testBadge}</span>
        </div>
        <main id="main-content" tabIndex={-1} className="payment-result-main">
          <p className="payment-result-badge" role="note"><ShieldCheck size={16} aria-hidden="true" />{t.testBadge}</p>
          {status === 'confirming' && <section className="payment-result-state" aria-live="polite">
            <span className="payment-result-loading"><Loader2 size={30} aria-hidden="true" /></span>
            <h1 ref={resultRef} tabIndex={-1}>{t.confirming}</h1>
          </section>}
          {status === 'done' && <section className="payment-result-state payment-result-success-state">
            <div className="payment-success-mark" aria-hidden="true"><Globe2 size={46} /><span><Check size={24} /></span></div>
            <h1 ref={resultRef} tabIndex={-1}>{t.doneTitle}</h1>
            <p className="payment-result-desc">{t.doneDesc}</p>
            <div className="payment-receipt" aria-label={t.receipt}>
              <div className="payment-receipt-heading"><ReceiptText size={18} aria-hidden="true" /><h2>{t.receipt}</h2></div>
              <dl>
                <div><dt>{t.amount}</dt><dd className="payment-receipt-amount">{formattedAmount}</dd></div>
                <div><dt>{t.period}</dt><dd>{t.periodValue}</dd></div>
                <div><dt>{t.order}</dt><dd className="payment-order-id" title={orderId}>{displayOrderId || '-'}</dd></div>
                <div><dt>{t.status}</dt><dd className="payment-receipt-status"><Check size={14} aria-hidden="true" />{t.done}</dd></div>
              </dl>
            </div>
            <p className="payment-result-test-note"><ShieldCheck size={16} aria-hidden="true" />{t.testNote}</p>
            <Button size="lg" glow className="payment-result-cta" onClick={() => navigate('/dashboard')}>{t.goDashboard}</Button>
          </section>}
          {status === 'error' && <section className="payment-result-state payment-result-error-state">
            <span className="payment-error-mark" aria-hidden="true"><X size={30} /></span>
            <h1 ref={resultRef} tabIndex={-1}>{t.failTitle}</h1>
            <p className="payment-result-desc">{errorMessage || t.failDesc}</p>
            {canRetry && <Button size="lg" className="payment-result-cta" onClick={() => { setStatus('confirming'); setCanRetry(false); setAttempt(value => value + 1) }}>{t.retry}</Button>}
            <Link to="/pricing" className="payment-result-secondary-cta">{t.goPricing}</Link>
          </section>}
        </main>
      </div>
      <Footer />
    </div>
  )
}
