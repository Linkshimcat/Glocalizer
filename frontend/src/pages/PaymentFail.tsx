import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import Footer from '../components/Footer'
import { useSiteLang } from '../i18n/LanguageContext'

const labels = {
  ko: { title: '테스트 결제가 완료되지 않았어요', goPricing: '요금제로 돌아가기', test: 'TossPayments 테스트 모드 · 실제 결제나 청구는 발생하지 않습니다.' },
  en: { title: 'Your test payment wasn’t completed', goPricing: 'Back to plans', test: 'TossPayments test mode · No real payment or charge occurs.' },
  ja: { title: 'テスト決済が完了しませんでした', goPricing: 'プランに戻る', test: 'TossPaymentsテストモード · 実際の決済・請求は発生しません。' },
  zh: { title: '测试付款未完成', goPricing: '返回方案', test: 'TossPayments 测试模式 · 不会产生真实付款或扣款。' },
}

export default function PaymentFail() {
  const { lang } = useSiteLang()
  const t = labels[lang]
  const [searchParams] = useSearchParams()
  const titleRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => { titleRef.current?.focus() }, [])
  const message = searchParams.get('message')
  const code = searchParams.get('code')

  return (
    <div className="flex min-h-svh flex-col">
      <main id="main-content" tabIndex={-1} className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-10 text-center sm:py-20">
        <p className="payment-test-notice" role="note">{t.test}</p>
        <span className="grid h-16 w-16 place-items-center rounded-full bg-red-100 text-red-600"><X className="h-8 w-8" /></span>
        <div>
          <h1 ref={titleRef} tabIndex={-1} className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t.title}</h1>
          {message && <p className="mt-2 font-medium text-sub">{message}</p>}
          {code && <p className="mt-1 text-xs text-sub">{code}</p>}
        </div>
        <Link to="/pricing" className="font-bold text-brand underline">{t.goPricing}</Link>
      </main>
      <Footer />
    </div>
  )
}
