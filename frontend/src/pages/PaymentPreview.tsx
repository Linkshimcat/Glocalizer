import { useEffect, useRef, useState } from 'react'
import { loadTossPayments } from '@tosspayments/tosspayments-sdk'
import { ArrowLeft, Check, Loader2, ShieldCheck, Sparkles } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import { useSiteLang } from '../i18n/LanguageContext'
import { pricingCopy } from '../i18n/pricing'
import { useAuth } from '../store/AuthContext'
import { createPaymentOrder } from '../lib/api'
import { requestErrorMessage } from '../lib/requestError'
import { experienceCopy } from '../i18n/experience'
import Footer from '../components/Footer'
import '../payment.css'

const TOSS_CLIENT_KEY = import.meta.env.VITE_TOSS_CLIENT_KEY as string | undefined
const TOSS_VARIANT_KEY = (import.meta.env.VITE_TOSS_VARIANT_KEY as string | undefined)?.trim() || 'DEFAULT'
type TossWidgets = ReturnType<Awaited<ReturnType<typeof loadTossPayments>>['widgets']>

const labels = {
  ko: { back: '요금제로 돌아가기', title: '멤버십 테스트 결제', sub: 'TossPayments 테스트 결제창으로 진행합니다.', test: '테스트 결제 · 실제 결제나 청구는 발생하지 않습니다.', windowTitle: 'TossPayments 결제창', windowDescription: '테스트 결제하기를 누르면 TossPayments 결제창이 열립니다. 결제수단과 약관은 결제창에서 선택합니다.', order: '선택한 멤버십', cycle: '이용 기간', period: '결제 승인일로부터 30일', total: '테스트 결제 금액', confirm: '테스트 결제하기', loading: '결제 정보를 준비하고 있어요…', retry: '다시 시도', notConfigured: '테스트 키가 설정되지 않았어요. VITE_TOSS_CLIENT_KEY에 test_gck_ 키를 설정해주세요.', safe: '카드 정보는 Glocalizer 서버에 저장되지 않습니다.', pending: '승인 확인 중입니다. 잠시 기다린 뒤 성공 페이지에서 다시 확인해주세요.' },
  en: { back: 'Back to plans', title: 'Membership test payment', sub: 'Continue with the TossPayments test checkout.', test: 'Test payment · No real payment or charge will occur.', windowTitle: 'TossPayments checkout', windowDescription: 'Press the test payment button to open the TossPayments checkout. Choose the payment method and accept the terms there.', order: 'Membership', cycle: 'Access period', period: '30 days from approval', total: 'Test amount', confirm: 'Pay with test mode', loading: 'Preparing payment…', retry: 'Try again', notConfigured: 'Test key is not configured. Set a test_gck_ key in VITE_TOSS_CLIENT_KEY.', safe: 'Card details are not stored on Glocalizer servers.', pending: 'Payment approval is being checked. Wait briefly, then retry from the success page.' },
  ja: { back: 'プランに戻る', title: 'メンバーシップのテスト決済', sub: 'TossPaymentsのテスト決済画面に進みます。', test: 'テスト決済 · 実際の決済・請求は発生しません。', windowTitle: 'TossPayments決済画面', windowDescription: 'テスト決済ボタンを押すとTossPaymentsの決済画面が開きます。決済方法と規約は画面で選択します。', order: 'メンバーシップ', cycle: '利用期間', period: '決済承認日から30日間', total: 'テスト金額', confirm: 'テスト決済する', loading: '決済情報を準備しています…', retry: '再試行', notConfigured: 'テストキーが未設定です。VITE_TOSS_CLIENT_KEYにtest_gck_キーを設定してください。', safe: 'カード情報はGlocalizerのサーバーに保存されません。', pending: '決済承認を確認中です。少し待ってから成功ページで再試行してください。' },
  zh: { back: '返回方案', title: '会员测试付款', sub: '将进入 TossPayments 测试付款页面。', test: '测试付款 · 不会产生真实付款或扣款。', windowTitle: 'TossPayments 付款页面', windowDescription: '点击测试付款按钮后会打开 TossPayments 付款页面。请在那里选择付款方式并同意条款。', order: '所选会员', cycle: '使用期限', period: '付款批准后30天', total: '测试金额', confirm: '测试付款', loading: '正在准备付款信息…', retry: '重试', notConfigured: '尚未配置测试密钥。请在 VITE_TOSS_CLIENT_KEY 中设置 test_gck_ 密钥。', safe: 'Glocalizer 服务器不会保存银行卡信息。', pending: '正在确认付款批准。请稍候，然后在成功页面重试。' },
}

export default function PaymentPreview() {
  const { lang } = useSiteLang()
  const t = labels[lang]
  const plan = pricingCopy[lang].plans[1]
  const { user, isAuthenticated, checkingSession } = useAuth()
  const [order, setOrder] = useState<{ orderId: string; amount: number; orderName: string } | null>(null)
  const [ready, setReady] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const errorRef = useRef<HTMLParagraphElement>(null)
  const widgetsRef = useRef<TossWidgets | null>(null)
  const inFlight = useRef(false)

  useEffect(() => {
    if (error) errorRef.current?.focus()
  }, [error])

  useEffect(() => {
    if (!user || checkingSession) return
    if (!TOSS_CLIENT_KEY?.startsWith('test_gck_')) {
      setError(t.notConfigured)
      return
    }
    let active = true
    async function prepare() {
      try {
        const createdOrder = await createPaymentOrder('creator')
        if (!active) return
        setOrder(createdOrder)
        const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY!)
        const widgets = tossPayments.widgets({ customerKey: user!.id })
        widgetsRef.current = widgets
        await widgets.setAmount({ currency: 'KRW', value: createdOrder.amount })
        if (active) setReady(true)
      } catch (reason) {
        if (active) setError(requestErrorMessage(reason, lang, t.notConfigured))
      }
    }

    void prepare()
    return () => {
      active = false
      widgetsRef.current = null
    }
  }, [user, checkingSession, lang, t.notConfigured])

  if (checkingSession && !user) return <main id="main-content" tabIndex={-1} role="status" className="ui-recovery-page">{experienceCopy[lang].loading}</main>
  if (!isAuthenticated || !user) return <Navigate to="/login?next=/pricing?checkout=creator" replace />

  async function handleSubmit() {
    if (inFlight.current || !ready || !order || !widgetsRef.current) return
    inFlight.current = true
    setSubmitting(true)
    setError('')
    try {
      await widgetsRef.current.requestPaymentWindow({
        orderId: order.orderId,
        orderName: order.orderName,
        amount: { currency: 'KRW', value: order.amount },
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/fail`,
        customerEmail: user?.email ?? undefined,
        customerName: user?.name ?? undefined,
      }, TOSS_VARIANT_KEY === 'DEFAULT' ? undefined : {
        variantKey: { paymentMethod: TOSS_VARIANT_KEY, agreement: TOSS_VARIANT_KEY },
      })
    } catch (reason) {
      setError(requestErrorMessage(reason, lang, t.notConfigured))
      inFlight.current = false
      setSubmitting(false)
    }
  }

  return <div className="payment-page"><main id="main-content" tabIndex={-1} className="payment-main">
    <Link className="payment-back" to="/pricing"><ArrowLeft size={16} />{t.back}</Link>
    <header className="payment-heading"><span className="payment-preview-label">TEST MODE</span><h1>{t.title}</h1><p>{t.sub}</p></header>
    <p className="payment-test-notice" role="note"><ShieldCheck size={19} />{t.test}</p>
    <div className="payment-layout"><section className="payment-panel payment-window-panel">
      <h2>{t.windowTitle}</h2>
      <p className="payment-window-copy">{t.windowDescription}</p>
      <div className="payment-window-mark"><ShieldCheck size={24} /><span>TEST MODE</span></div>
    </section><aside className="payment-panel payment-summary">
      <div className="payment-summary-heading"><h2>{t.order}</h2><Link to="/pricing">{t.back}</Link></div>
      <div className="payment-plan"><span><Sparkles size={22} /></span><div><strong>{plan.name}</strong><p>{plan.description}</p></div></div>
      <ul>{plan.features.map(feature => <li key={feature}><Check size={16} />{feature}</li>)}</ul>
      <dl><div><dt>{t.cycle}</dt><dd>{t.period}</dd></div></dl>
      <div className="payment-total"><span>{t.total}</span><strong>{plan.price}</strong></div>
      {!ready && !error && <p role="status" className="payment-footnote"><Loader2 className="h-4 w-4 animate-spin" />{t.loading}</p>}
      {error && <p ref={errorRef} tabIndex={-1} role="alert" className="payment-error">{error}</p>}
      {error && TOSS_CLIENT_KEY?.startsWith('test_gck_') && <button className="payment-submit" onClick={() => window.location.reload()}>{t.retry}</button>}
      {!error && <button className="payment-submit" disabled={!ready || submitting} onClick={() => { void handleSubmit() }}>{submitting ? t.loading : t.confirm}</button>}
      <p className="payment-safe"><ShieldCheck size={15} />{t.safe}</p>
    </aside></div>
    <p className="payment-pending-note">{t.pending}</p>
  </main><Footer /></div>
}
