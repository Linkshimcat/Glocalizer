import { useEffect, useRef, useState } from 'react'
import { loadTossPayments } from '@tosspayments/tosspayments-sdk'
import { ArrowLeft, Check, CreditCard, Loader2, ShieldCheck, Sparkles } from 'lucide-react'
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

const labels = {
  ko: { back: '요금제로 돌아가기', title: '편한 방법으로 시작하세요', sub: '작가님의 창작이 더 넓은 세상으로 이어지도록.', steps: ['요금제 선택', '결제 방법', '결제'], method: '결제 방법을 선택해주세요', easy: '간편결제', card: '신용·체크카드', detail: '선택한 결제 수단', hint: '토스페이먼츠 결제창으로 이동해 최종 결제 수단을 다시 확인할 수 있어요.', order: '선택한 멤버십', change: '변경', cycle: '이용 주기', monthly: '월 구독', total: '결제 금액', next: '다음 결제일', pending: '정기결제는 아직 지원하지 않아요 · 1개월 이용', confirm: '결제하기', submitting: '결제창으로 이동하는 중…', safe: '결제 정보를 입력하거나 저장하지 않아요', notConfigured: '결제 기능이 아직 설정되지 않았어요.' },
  en: { back: 'Back to plans', title: 'Start your way', sub: 'Bring your creations to a wider world.', steps: ['Choose a plan', 'Payment method', 'Pay'], method: 'Choose a payment method', easy: 'Express checkout', card: 'Credit / debit card', detail: 'Selected method', hint: 'You can confirm your final payment method on the TossPayments checkout page.', order: 'Your membership', change: 'Change', cycle: 'Billing cycle', monthly: 'Monthly', total: 'Amount due', next: 'Next payment', pending: 'Recurring billing is not available yet · 1 month of access', confirm: 'Pay now', submitting: 'Opening checkout…', safe: 'No payment details are collected or saved', notConfigured: 'Payment is not configured yet.' },
  ja: { back: 'プランに戻る', title: 'お好きな方法で始めましょう', sub: 'あなたの創作を、もっと広い世界へ。', steps: ['プラン選択', '決済方法', '決済'], method: '決済方法を選んでください', easy: 'かんたん決済', card: 'クレジット・デビットカード', detail: '選択した決済方法', hint: 'トスペイメンツの決済画面で最終的な決済手段を確認できます。', order: '選択したプラン', change: '変更', cycle: '利用周期', monthly: '月額', total: '決済金額', next: '次回決済日', pending: '定期決済は未対応です・1か月間利用可能', confirm: '決済する', submitting: '決済画面に移動中…', safe: '決済情報の入力・保存は行いません', notConfigured: '決済機能はまだ設定されていません。' },
  zh: { back: '返回方案', title: '用您喜欢的方式开始', sub: '让您的创作走向更广阔的世界。', steps: ['选择方案', '付款方式', '付款'], method: '请选择付款方式', easy: '快捷支付', card: '信用卡 / 借记卡', detail: '已选付款方式', hint: '可在 TossPayments 结算页面确认最终付款方式。', order: '所选会员', change: '更改', cycle: '订阅周期', monthly: '每月', total: '应付金额', next: '下次付款日期', pending: '暂不支持自动扣款 · 可使用 1 个月', confirm: '去付款', submitting: '正在跳转到结算页面…', safe: '不会收集或保存付款信息', notConfigured: '付款功能尚未配置。' },
}
const methods = [{ id: 'toss', name: '토스페이', mark: 'toss pay' }, { id: 'naver', name: '네이버페이', mark: 'N pay' }, { id: 'kakao', name: '카카오페이', mark: 'pay' }, { id: 'card', name: '', mark: '' }]

export default function PaymentPreview() {
  const { lang } = useSiteLang()
  const t = labels[lang]
  const plan = pricingCopy[lang].plans[1]
  const { user, isAuthenticated, checkingSession } = useAuth()
  const [method, setMethod] = useState('toss')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const errorRef = useRef<HTMLParagraphElement>(null)
  const inFlight = useRef(false)
  const selectedLabel = { ko: '선택됨', en: 'Selected', ja: '選択済み', zh: '已选择' }[lang]
  useEffect(() => { if (error) errorRef.current?.focus() }, [error])
  const selected = method === 'card' ? t.card : methods.find(item => item.id === method)!.name

  if (checkingSession && !user) return <main id="main-content" tabIndex={-1} role="status" className="ui-recovery-page">{experienceCopy[lang].loading}</main>
  if (!isAuthenticated || !user) return <Navigate to="/login?next=/pricing?checkout=creator" replace />

  async function handleSubmit() {
    if (inFlight.current) return
    setError('')
    if (!TOSS_CLIENT_KEY) { setError(t.notConfigured); return }
    inFlight.current = true
    setSubmitting(true)
    try {
      const order = await createPaymentOrder('creator')
      const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY)
      const payment = tossPayments.payment({ customerKey: user!.id })
      await payment.requestPayment({
        method: 'CARD',
        amount: { currency: 'KRW', value: order.amount },
        orderId: order.orderId,
        orderName: order.orderName,
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/fail`,
        customerEmail: user!.email ?? undefined,
        customerName: user!.name ?? undefined,
      })
    } catch (error) {
      setError(requestErrorMessage(error, lang, t.notConfigured))
      inFlight.current = false
      setSubmitting(false)
    }
  }

  return <div className="payment-page"><main id="main-content" tabIndex={-1} className="payment-main">
    <Link className="payment-back" to="/pricing"><ArrowLeft size={16} />{t.back}</Link>
    <header className="payment-heading"><h1>{t.title}</h1><p>{t.sub}</p></header>
    <ol className="payment-steps">{t.steps.map((step, index) => <li key={step} aria-current={index === 1 ? 'step' : undefined}><span>{index === 0 ? <Check size={14} /> : index + 1}</span>{step}</li>)}</ol>
    <div className="payment-layout"><section className="payment-panel">
      <h2>{t.method}</h2><p className="payment-muted">{t.easy}</p>
      <fieldset className="payment-methods" disabled={submitting}><legend className="sr-only">{t.method}</legend>{methods.map(item => <label key={item.id} className={`payment-method ${method === item.id ? 'is-selected' : ''}`}><input type="radio" name="payment-method" value={item.id} checked={method === item.id} onChange={() => { setMethod(item.id); setError('') }} /><span aria-hidden="true" className={`payment-brand payment-brand-${item.id}`}>{item.id === 'card' ? <CreditCard size={28} /> : item.mark}</span><span>{item.id === 'card' ? t.card : item.name}</span><span className="payment-selected" aria-hidden="true">{method === item.id && <><Check size={14} />{selectedLabel}</>}</span></label>)}</fieldset>
      <div className="payment-method-info"><ShieldCheck size={21} /><div><strong>{selected}</strong><p>{t.hint}</p></div></div>
    </section><aside className="payment-panel payment-summary"><div className="payment-summary-heading"><h2>{t.order}</h2><Link to="/pricing">{t.change}</Link></div><div className="payment-plan"><span><Sparkles size={22} /></span><div><strong>{plan.name}</strong><p>{plan.description}</p></div></div><ul>{plan.features.map(feature => <li key={feature}><Check size={16} />{feature}</li>)}</ul><dl><div><dt>{t.cycle}</dt><dd>{t.monthly}</dd></div><div><dt>{t.detail}</dt><dd>{selected}</dd></div><div><dt>{t.next}</dt><dd>{t.pending}</dd></div></dl><div className="payment-total"><span>{t.total}</span><strong>{plan.price}</strong></div>
      <p role="status" aria-live="polite" className="payment-footnote">{submitting ? t.submitting : ''}</p>
      {error && <p ref={errorRef} tabIndex={-1} role="alert" className="payment-error">{error}</p>}
      <button className="payment-submit" disabled={submitting} onClick={() => { void handleSubmit() }}>{submitting && <Loader2 className="h-4 w-4 animate-spin" />}{submitting ? t.submitting : t.confirm}</button><p className="payment-safe"><ShieldCheck size={15} />{t.safe}</p>
    </aside></div>
  </main><Footer /></div>
}
