import { useState } from 'react'
import { ArrowLeft, Check, CreditCard, ShieldCheck, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useSiteLang } from '../i18n/LanguageContext'
import { pricingCopy } from '../i18n/pricing'
import Footer from '../components/Footer'
import '../payment.css'

const labels = {
  ko: { back: '요금제로 돌아가기', title: '편한 방법으로 시작하세요', sub: '작가님의 창작이 더 넓은 세상으로 이어지도록.', preview: '결제 화면 미리보기', notice: '실제 결제나 구독은 시작되지 않아요. 가격과 결제 수단은 예시입니다.', steps: ['요금제 선택', '결제 방법', '최종 확인'], method: '결제 방법을 선택해주세요', easy: '간편결제', card: '신용·체크카드', detail: '선택한 결제 수단', hint: '실제 서비스에서는 선택한 결제사의 인증 화면으로 연결됩니다.', order: '선택한 멤버십', change: '변경', cycle: '이용 주기', monthly: '월 구독 · 예시', total: '예상 월 결제 금액', next: '다음 결제일', pending: '실제 구독 시작 시 안내', confirm: '선택 내용 확인하기', done: '선택 내용을 확인했어요', doneText: '미리보기가 완료됐어요. 결제·자동결제 등록·멤버십 가입은 이루어지지 않았습니다.', edit: '결제 방법 다시 선택', safe: '결제 정보를 입력하거나 저장하지 않아요', recurring: '정기결제 지원 여부와 최종 이용 조건은 출시 시 안내됩니다.' },
  en: { back: 'Back to plans', title: 'Start your way', sub: 'Bring your creations to a wider world.', preview: 'Checkout preview', notice: 'No payment or subscription will start. Prices and methods are examples.', steps: ['Choose a plan', 'Payment method', 'Review'], method: 'Choose a payment method', easy: 'Express checkout', card: 'Credit / debit card', detail: 'Selected method', hint: 'The live service would open the payment provider’s authentication screen.', order: 'Your membership', change: 'Change', cycle: 'Billing cycle', monthly: 'Monthly · Example', total: 'Estimated monthly total', next: 'Next payment', pending: 'Available when a subscription starts', confirm: 'Review selection', done: 'Selection reviewed', doneText: 'Preview complete. No payment, recurring billing or membership was created.', edit: 'Choose another method', safe: 'No payment details are collected or saved', recurring: 'Recurring billing availability and final terms will be announced at launch.' },
  ja: { back: 'プランに戻る', title: 'お好きな方法で始めましょう', sub: 'あなたの創作を、もっと広い世界へ。', preview: '決済画面プレビュー', notice: '決済や契約は開始されません。価格と決済方法は例です。', steps: ['プラン選択', '決済方法', '確認'], method: '決済方法を選んでください', easy: 'かんたん決済', card: 'クレジット・デビットカード', detail: '選択した決済方法', hint: '実際のサービスでは決済会社の認証画面に移動します。', order: '選択したプラン', change: '変更', cycle: '利用周期', monthly: '月額・例', total: '月額予定金額', next: '次回決済日', pending: '契約開始時にご案内', confirm: '選択内容を確認', done: '選択内容を確認しました', doneText: 'プレビュー完了。決済・自動決済登録・契約は行われていません。', edit: '決済方法を選び直す', safe: '決済情報の入力・保存は行いません', recurring: '定期決済への対応と利用条件は提供開始時にご案内します。' },
  zh: { back: '返回方案', title: '用您喜欢的方式开始', sub: '让您的创作走向更广阔的世界。', preview: '付款页面预览', notice: '不会付款或开通订阅。价格和付款方式仅为示例。', steps: ['选择方案', '付款方式', '确认'], method: '请选择付款方式', easy: '快捷支付', card: '信用卡 / 借记卡', detail: '已选付款方式', hint: '正式服务将跳转至支付平台进行验证。', order: '所选会员', change: '更改', cycle: '订阅周期', monthly: '每月 · 示例', total: '预计每月金额', next: '下次付款日期', pending: '开通订阅时提供', confirm: '确认选择', done: '已确认选择', doneText: '预览完成。未付款、未开通自动扣款或会员。', edit: '重新选择付款方式', safe: '不会收集或保存付款信息', recurring: '自动扣款支持情况及最终条款将在上线时公布。' },
}
const methods = [{ id: 'toss', name: '토스페이', mark: 'toss pay' }, { id: 'naver', name: '네이버페이', mark: 'N pay' }, { id: 'kakao', name: '카카오페이', mark: 'pay' }, { id: 'card', name: '', mark: '' }]
export default function PaymentPreview() {
  const { lang } = useSiteLang()
  const t = labels[lang]
  const plan = pricingCopy[lang].plans[1]
  const [method, setMethod] = useState('toss')
  const [reviewed, setReviewed] = useState(false)
  const selected = method === 'card' ? t.card : methods.find(item => item.id === method)!.name
  return <div className="payment-page"><main id="main-content" tabIndex={-1} className="payment-main">
    <Link className="payment-back" to="/pricing"><ArrowLeft size={16} />{t.back}</Link>
    <header className="payment-heading"><span className="payment-preview-label">{t.preview}</span><h1>{t.title}</h1><p>{t.sub}</p></header>
    <ol className="payment-steps">{t.steps.map((step, index) => <li key={step} aria-current={index === (reviewed ? 2 : 1) ? 'step' : undefined}><span>{index < (reviewed ? 2 : 1) ? <Check size={14} /> : index + 1}</span>{step}</li>)}</ol>
    <p className="payment-notice">{t.notice}</p>
    <div className="payment-layout"><section className="payment-panel">
      <h2>{t.method}</h2><p className="payment-muted">{t.easy}</p>
      <fieldset className="payment-methods" disabled={reviewed}><legend className="sr-only">{t.method}</legend>{methods.map(item => <label key={item.id} className={`payment-method ${method === item.id ? 'is-selected' : ''}`}><input type="radio" name="payment-method" value={item.id} checked={method === item.id} onChange={() => setMethod(item.id)} /><span className={`payment-brand payment-brand-${item.id}`}>{item.id === 'card' ? <CreditCard size={28} /> : item.mark}</span><span>{item.id === 'card' ? t.card : item.name}</span></label>)}</fieldset>
      <div className="payment-method-info"><ShieldCheck size={21} /><div><strong>{selected}</strong><p>{t.hint}</p></div></div>
      <p className="payment-footnote">{t.recurring}</p>
    </section><aside className="payment-panel payment-summary"><div className="payment-summary-heading"><h2>{t.order}</h2><Link to="/pricing">{t.change}</Link></div><div className="payment-plan"><span><Sparkles size={22} /></span><div><strong>{plan.name}</strong><p>{plan.description}</p></div></div><ul>{plan.features.map(feature => <li key={feature}><Check size={16} />{feature}</li>)}</ul><dl><div><dt>{t.cycle}</dt><dd>{t.monthly}</dd></div><div><dt>{t.detail}</dt><dd>{selected}</dd></div><div><dt>{t.next}</dt><dd>{t.pending}</dd></div></dl><div className="payment-total"><span>{t.total}</span><strong>{plan.price}</strong></div>
      <button className="payment-submit" onClick={() => setReviewed(!reviewed)}>{reviewed ? t.edit : t.confirm}</button><p className="payment-safe"><ShieldCheck size={15} />{t.safe}</p>
    </aside></div>
    <div role="status" aria-live="polite">{reviewed && <section className="payment-result"><Check size={24} /><div><h2>{t.done}</h2><p>{t.doneText}</p></div></section>}</div>
  </main><Footer /></div>
}
