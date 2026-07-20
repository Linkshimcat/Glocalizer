import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import translateIcon from '../assets/iconsax-translate.svg'
import Footer from '../components/Footer'
import Header from '../components/Header'
import { LANGUAGES } from '../store/uploads'

/** 언어 코드 → 칩에 표시할 짧은 코드 (예: zh-TW → ZH-TW, ja → JA) */
const shortCode = (code: string) => code.toUpperCase()

/** 히어로 우측 카드 순환용 — 지역 변형 중복 제거(zh-TW 등) */
const CYCLE_LANGS = LANGUAGES.filter(
  (l, i, arr) =>
    arr.findIndex(x => x.code.split('-')[0] === l.code.split('-')[0]) === i,
)

export default function Landing() {
  const navigate = useNavigate()

  // KR → ?? 언어 순환 (페이드 아웃 → 교체 → 페이드 인)
  const [cycleIdx, setCycleIdx] = useState(0)
  const [fading, setFading] = useState(false)
  useEffect(() => {
    const timer = setInterval(() => {
      setFading(true)
      setTimeout(() => {
        setCycleIdx(i => (i + 1) % CYCLE_LANGS.length)
        setFading(false)
      }, 350)
    }, 2200)
    return () => clearInterval(timer)
  }, [])

  const cycleLang = CYCLE_LANGS[cycleIdx]

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="mx-auto grid w-full max-w-[1400px] flex-1 items-center gap-16 px-10 py-20 lg:grid-cols-2">
        {/* 좌측: 카피 */}
        <div>
          <h1 className="text-5xl leading-[1.25] font-extrabold tracking-tight md:text-[56px]">
            한국 이모티콘,
            <br />
            <span className="text-brand">전 세계 언어로</span>
            <span className="ml-1">🌏</span>
            <br />
            자동 번역{' '}
            <img
              src={translateIcon}
              alt=""
              aria-hidden
              className="inline-block h-11 w-11 align-[-4px]"
            />
          </h1>

          <p className="mt-7 text-[17px] leading-relaxed font-medium text-[#4E5968]">
            AI가 이미지 속 텍스트를 인식하고 제거한 뒤,
            <br />각 문화에 맞는 표현으로 재삽입합니다.
          </p>

          <p className="mt-12 text-sm font-semibold text-[#4E5968]">
            *{LANGUAGES.length}개국 지원.
          </p>
          <div className="mt-3 flex max-w-[520px] flex-wrap gap-2">
            {LANGUAGES.map(lang => (
              <span
                key={lang.code}
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-sm font-semibold text-[#4E5968]"
              >
                <span>{lang.flag}</span>
                {shortCode(lang.code)}
              </span>
            ))}
          </div>
        </div>

        {/* 우측: 데모 비주얼 — KR에서 여러 언어로 현지화 */}
        <div className="relative h-[480px] overflow-hidden rounded-[28px] border-[1.5px] border-ink bg-[#FBFBFB]">
          {/* KR 카드 — 좌측 상단, 프레임 밖으로 살짝 잘림 */}
          <div className="absolute -left-12 top-12 flex items-center gap-3 rounded-3xl bg-surface py-7 pl-16 pr-9 shadow-[0_16px_40px_rgba(0,0,0,0.08)]">
            <span className="text-4xl">🇰🇷</span>
            <span className="text-5xl font-extrabold text-ink">KR</span>
          </div>

          {/* 순환 언어 카드 — 우측 하단, EN→JP→ZH→… 페이드 전환 */}
          <div className="absolute -right-12 bottom-14 flex items-center gap-3 rounded-3xl bg-surface py-7 pl-9 pr-16 shadow-[0_16px_40px_rgba(0,0,0,0.08)]">
            <span
              className={`text-4xl transition-opacity duration-300 ${fading ? 'opacity-0' : 'opacity-100'}`}
            >
              {cycleLang.flag}
            </span>
            <span
              className={`min-w-[100px] text-5xl font-extrabold text-ink transition-opacity duration-300 ${fading ? 'opacity-0' : 'opacity-100'}`}
            >
              {shortCode(cycleLang.code)}
            </span>
          </div>

          {/* 중앙: 시작하기 버튼 */}
          <button
            onClick={() => navigate('/dashboard')}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-brand px-9 py-4 text-[22px] font-bold text-white shadow-[0_20px_50px_rgba(34,197,94,0.45)] transition-transform hover:scale-105 active:scale-100 sm:px-11 sm:py-5 sm:text-[26px]"
          >
            시작하기
          </button>
        </div>
      </main>

      <Footer />
    </div>
  )
}
