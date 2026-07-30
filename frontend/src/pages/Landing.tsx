import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Footer from '../components/Footer'
import Header from '../components/Header'
import NavMenu from '../components/NavMenu'
import { DEMO_ITEMS } from '../data/demo'
import countryBadges from '../assets/GCFrontendUI/country.svg'
import { LANGUAGES } from '../store/uploads'
import { useSiteLang } from '../i18n/LanguageContext'

// 히어로 목업의 After 문구 — 사이트 언어별 자연스러운 밈 번역(ko UI는 영어 예시).
const HERO_TRANSLATIONS: Record<string, Record<string, string>> = {
  '열공': { ko: 'Grinding 🔥', en: 'Grinding 🔥', ja: '勉強モード🔥', zh: '学习中🔥' },
  '대박': { ko: 'No way! 😱', en: 'No way! 😱', ja: 'やばい！😱', zh: '太棒了！😱' },
  '인정': { ko: 'Fr 💯', en: 'Fr 💯', ja: 'それな💯', zh: '确实💯' },
}

export default function Landing() {
  const navigate = useNavigate()
  const { t, lang } = useSiteLang()
  const [cycleIdx, setCycleIdx] = useState(0)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setFading(true)
      window.setTimeout(() => {
        setCycleIdx(index => (index + 1) % DEMO_ITEMS.length)
        setFading(false)
      }, 350)
    }, 2200)
    return () => window.clearInterval(timer)
  }, [])

  const cycleItem = DEMO_ITEMS[cycleIdx]
  const translatedText =
    HERO_TRANSLATIONS[cycleItem.korean]?.[lang] ??
    cycleItem.suggestions.find(suggestion => suggestion.best)?.text ??
    cycleItem.suggestions[0].text

  return (
    <div className="flex min-h-screen flex-col">
      <Header center={<NavMenu />} sticky />

      <main className="mx-auto grid w-full max-w-[1240px] flex-1 items-center gap-10 px-4 py-10 sm:gap-14 sm:px-10 sm:py-14 lg:grid-cols-2 lg:py-20">
        <div>
          <p className="text-sm font-extrabold tracking-wide text-brand-dark">{t.heroBrandTag}</p>
          <h1 className="mt-3 text-[42px] leading-[1.12] font-extrabold tracking-tight sm:text-5xl md:text-[60px]">
            {t.heroLine1}
            <br />
            <span className="text-brand">{t.heroLine2}</span>
          </h1>
          <p className="mt-5 max-w-[420px] text-[15px] font-medium text-sub sm:mt-6 sm:text-[17px]">
            {t.heroDesc}
          </p>
          <Button size="lg" onClick={() => navigate('/dashboard')} className="mt-7 w-full sm:mt-8 sm:w-auto">
            {t.heroCta}
          </Button>

        </div>

        <section className="overflow-hidden rounded-[24px] bg-[#FAFBFC] p-4 sm:rounded-[32px] sm:p-10">
          <div className="mb-6 text-center sm:mb-8">
            <p className="text-sm font-extrabold text-brand-dark">{t.beforeAfter}</p>
            <h2 className="mt-1 text-2xl font-extrabold text-ink">
              {t.cardTitle}
            </h2>
          </div>
          <div
            className={`grid w-full grid-cols-1 items-center gap-3 transition-opacity duration-300 sm:min-h-[290px] sm:grid-cols-[1fr_auto_1fr] sm:gap-5 ${
              fading ? 'opacity-0' : 'opacity-100'
            }`}
          >
            <div className="rounded-2xl bg-white p-4 text-center sm:rounded-3xl sm:p-7">
              <p className="text-xs font-bold text-sub">{t.beforeLabel}</p>
              <span className="mt-4 block text-5xl sm:mt-6 sm:text-6xl">{cycleItem.emoji}</span>
              <span className="mt-4 inline-flex rounded-lg border-2 border-dashed border-sub/60 px-3 py-1 text-base font-extrabold text-ink sm:mt-5 sm:text-lg">
                {cycleItem.korean}
              </span>
            </div>
            <span aria-hidden className="rotate-90 text-center text-2xl font-extrabold text-brand-dark sm:rotate-0 sm:text-3xl">
              ⇒
            </span>
            <div className="checkerboard rounded-2xl p-4 text-center sm:rounded-3xl sm:p-7">
              <p className="text-xs font-bold text-sub">{t.afterLabel}</p>
              <span className="mt-4 block text-5xl sm:mt-6 sm:text-6xl">{cycleItem.emoji}</span>
              <span className="mt-4 inline-flex rounded-lg bg-white/90 px-3 py-1 text-base font-extrabold text-ink sm:mt-5 sm:text-lg">
                {translatedText}
              </span>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 sm:mt-7 sm:gap-3">
            <p className="text-center text-sm font-bold text-sub">
              <span className="text-brand-dark">{LANGUAGES.length}{t.langCountUnit}</span>{t.langCountSuffix}
            </p>
            <img src={countryBadges} alt="EN · JP · ZH" className="h-11 w-auto" aria-label="지원 언어: 영어 · 일본어 · 중국어" />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
