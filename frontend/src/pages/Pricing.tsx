import { ArrowRight, Check, ChevronDown, Info, MessageCircle, Sparkles } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import PaymentPreview from './PaymentPreview'
import Footer from '../components/Footer'
import { useSiteLang } from '../i18n/LanguageContext'
import { pricingCopy } from '../i18n/pricing'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import '../pricing.css'

export default function Pricing() {
  const [searchParams] = useSearchParams()
  const { lang } = useSiteLang()
  const copy = pricingCopy[lang]
  useDocumentMeta({ ko: '멤버십 가격', en: 'Membership pricing', ja: 'メンバーシップ料金', zh: '会员价格' }[lang], copy.intro)

  if (searchParams.get('checkout') === 'creator') return <PaymentPreview />

  return (
    <div className="pricing-page flex min-h-svh flex-col bg-white">
      <main id="main-content" tabIndex={-1} className="pricing-main">
        <section className="pricing-intro" aria-labelledby="pricing-title">
          <p className="pricing-eyebrow">MEMBERSHIP</p>
          <h1 id="pricing-title">{copy.title.split('\n').map((line, i) => <span key={line}>{i > 0 && <br />}{line}</span>)}</h1>
          <p className="pricing-lead">{copy.intro}</p>
          <p className="pricing-notice" id="pricing-notice"><Info size={17} aria-hidden="true" /><span>{copy.notice}</span></p>
        </section>

        <section className="pricing-plans" aria-labelledby="pricing-title" aria-describedby="pricing-notice">
          {copy.plans.map((plan, i) => (
            <article className={`pricing-card ${i === 1 ? 'pricing-card-featured' : ''}`} key={plan.name}>
              <div className="pricing-card-tag">{i === 1 ? <span className="pricing-recommended"><Sparkles size={14} aria-hidden="true" />{copy.recommended}</span> : <span>{copy.pending}</span>}</div>
              <h2>{plan.name}</h2>
              <p className="pricing-description">{plan.description}</p>
              <div className={`pricing-amount ${i === 2 ? 'pricing-amount-custom' : ''}`}><strong>{plan.price}</strong><span>{plan.unit}</span></div>
              <ul>{plan.features.map(feature => <li key={feature}><span className="pricing-check"><Check size={15} strokeWidth={2.5} aria-hidden="true" /></span><span>{feature}</span></li>)}</ul>
              <Link to={i === 1 ? '/pricing?checkout=creator' : plan.to} className={`pricing-cta ${i === 1 ? 'pricing-cta-primary' : ''}`}>{i === 1 ? { ko: '테스트 결제 시작', en: 'Start test payment', ja: 'テスト決済を開始', zh: '开始测试付款' }[lang] : plan.cta}<ArrowRight size={17} aria-hidden="true" /></Link>
            </article>
          ))}
        </section>

        <aside className="pricing-help">
          <span className="pricing-help-icon"><MessageCircle size={23} aria-hidden="true" /></span>
          <div><h2>{copy.helpTitle}</h2><p>{copy.helpText}</p></div>
          <Link to="/support">{copy.helpLink}<ArrowRight size={17} aria-hidden="true" /></Link>
        </aside>

        <section className="pricing-faq" aria-labelledby="pricing-faq-title">
          <p className="pricing-eyebrow">FAQ</p>
          <h2 id="pricing-faq-title">{copy.faqTitle}</h2>
          <div className="pricing-faq-list">{copy.faqs.map(({ q, a }) => <details key={q}><summary>{q}<ChevronDown size={20} aria-hidden="true" /></summary><p>{a}</p></details>)}</div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
