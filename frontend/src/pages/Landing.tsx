import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Footer from '../components/Footer'
import Header from '../components/Header'
import { DEMO_ITEMS } from '../data/demo'
import { LANGUAGES } from '../store/uploads'

const shortCode = (code: string) => code.toUpperCase()

export default function Landing() {
  const navigate = useNavigate()
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
    cycleItem.suggestions.find(suggestion => suggestion.best)?.text ??
    cycleItem.suggestions[0].text

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        center={
          <nav aria-label="주요 메뉴" className="flex items-center gap-1">
            <button
              onClick={() => navigate('/dashboard')}
              className="rounded-xl bg-brand-soft px-3 py-1.5 text-[13px] font-bold text-brand-dark transition-colors hover:bg-brand hover:text-white md:px-4 md:py-2 md:text-sm"
            >
              시작하기
            </button>
            <button
              type="button"
              className="rounded-xl px-3 py-1.5 text-[13px] font-bold text-sub transition-colors hover:bg-surface hover:text-ink md:px-4 md:py-2 md:text-sm"
            >
              서비스 소개
            </button>
          </nav>
        }
      />

      <main className="mx-auto grid w-full max-w-[1240px] flex-1 items-center gap-10 px-4 py-10 sm:gap-14 sm:px-10 sm:py-14 lg:grid-cols-2 lg:py-20">
        <div>
          <p className="text-sm font-extrabold tracking-wide text-brand-dark">Glocalizer</p>
          <h1 className="mt-3 text-[42px] leading-[1.12] font-extrabold tracking-tight sm:text-5xl md:text-[60px]">
            한국 밈을
            <br />
            <span className="text-brand">전 세계 언어로</span>
          </h1>
          <p className="mt-5 max-w-[420px] text-[15px] font-medium text-sub sm:mt-6 sm:text-[17px]">
            이모티콘 속 한글을 자연스러운 현지 표현으로 바꿔드려요.
          </p>
          <Button size="lg" onClick={() => navigate('/dashboard')} className="mt-7 w-full sm:mt-8 sm:w-auto">
            무료로 시작하기
          </Button>

        </div>

        <section className="overflow-hidden rounded-[24px] bg-[#FAFBFC] p-4 sm:rounded-[32px] sm:p-10">
          <div className="mb-6 text-center sm:mb-8">
            <p className="text-sm font-extrabold text-brand-dark">Before → After</p>
            <h2 className="mt-1 text-2xl font-extrabold text-ink">
              한글 밈이 현지 표현이 돼요
            </h2>
          </div>
          <div
            className={`grid w-full grid-cols-1 items-center gap-3 transition-opacity duration-300 sm:min-h-[290px] sm:grid-cols-[1fr_auto_1fr] sm:gap-5 ${
              fading ? 'opacity-0' : 'opacity-100'
            }`}
          >
            <div className="rounded-2xl bg-white p-4 text-center sm:rounded-3xl sm:p-7">
              <p className="text-xs font-bold text-sub">Before · 원본</p>
              <span className="mt-4 block text-5xl sm:mt-6 sm:text-6xl">{cycleItem.emoji}</span>
              <span className="mt-4 inline-flex rounded-lg border-2 border-dashed border-sub/60 px-3 py-1 text-base font-extrabold text-ink sm:mt-5 sm:text-lg">
                {cycleItem.korean}
              </span>
            </div>
            <span aria-hidden className="rotate-90 text-center text-2xl font-extrabold text-brand-dark sm:rotate-0 sm:text-3xl">
              ⇒
            </span>
            <div className="checkerboard rounded-2xl p-4 text-center sm:rounded-3xl sm:p-7">
              <p className="text-xs font-bold text-sub">After · 변환</p>
              <span className="mt-4 block text-5xl sm:mt-6 sm:text-6xl">{cycleItem.emoji}</span>
              <span className="mt-4 inline-flex rounded-lg bg-white/90 px-3 py-1 text-base font-extrabold text-ink sm:mt-5 sm:text-lg">
                {translatedText}
              </span>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 sm:mt-7 sm:gap-3">
            <p className="text-center text-sm font-bold text-sub">
              <span className="text-brand-dark">{LANGUAGES.length}개 언어</span>로 바로 바꿔보세요
            </p>
            <div className="flex items-center gap-2 text-lg" aria-label="지원 언어">
              {LANGUAGES.map(lang => (
                <span key={lang.code} title={`${lang.label} (${shortCode(lang.code)})`}>
                  {lang.flag}
                </span>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
