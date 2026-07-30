import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import aboutKR from '../assets/ServicePageLending/about-KR.png'
import aboutEN from '../assets/ServicePageLending/about-EN.png'
import aboutJP from '../assets/ServicePageLending/about-JP.png'
import aboutZH from '../assets/ServicePageLending/about-ZH.png'
import iconCrop from '../assets/ServicePageLending/iconsax-crop.svg'
import iconFireworks from '../assets/ServicePageLending/iconsax-fireworks3.svg'
import iconImportArrow from '../assets/ServicePageLending/iconsax-import-arrow.svg'
import iconYoutube from '../assets/ServicePageLending/iconsax-youtube.svg'
import introduceVideo from '../IntroduceVideo.mp4'
import Footer from '../components/Footer'
import Header from '../components/Header'
import NavMenu from '../components/NavMenu'
import { useSiteLang } from '../i18n/LanguageContext'
import { serviceDict } from '../i18n/service'

function SectionHeading({ children }: { children: ReactNode }) {
  return <h2 className="text-[28px] font-extrabold tracking-tight sm:text-[32px]">{children}</h2>
}

const FEATURE_ICONS = [iconFireworks, iconCrop, iconImportArrow]

// 요약 이미지는 텍스트가 그림에 박혀 있어, 사이트 언어에 맞는 버전으로 교체한다.
const ABOUT_IMG: Record<string, string> = { ko: aboutKR, en: aboutEN, ja: aboutJP, zh: aboutZH }

export default function ServiceIntro() {
  const navigate = useNavigate()
  const { lang } = useSiteLang()
  const s = serviceDict[lang]

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        sticky
        center={<NavMenu />}
        right={
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[13px] font-bold text-sub transition-colors hover:bg-surface hover:text-ink md:px-4 md:py-2 md:text-sm"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
            {s.back}
          </button>
        }
      />

      <main className="mx-auto w-full max-w-[960px] px-6 pb-24 pt-12 sm:px-10 sm:pt-16">
        <h1 className="text-[42px] font-extrabold leading-tight tracking-tight sm:text-[52px]">
          {s.titleMain} <span className="text-brand">{s.titleAccent}</span>
        </h1>
        <p className="mt-6 text-xl font-bold leading-snug text-ink sm:text-2xl">
          {s.tagline}
        </p>
        <p className="mt-3 text-lg font-medium leading-relaxed text-sub sm:text-xl">
          {s.intro}
        </p>

        {/* 이런 고민 */}
        <section className="mt-20">
          <SectionHeading>{s.worryHead}</SectionHeading>
          <p className="mt-6 text-lg font-medium leading-[1.85] text-sub">
            {s.worryLead}
          </p>
          <ul className="mt-4 space-y-4 text-lg font-medium leading-[1.85] text-sub">
            {s.worries.map(item => (
              <li key={item.title} className="flex gap-3">
                <span aria-hidden className="text-brand">•</span>
                <span>
                  <span className="font-extrabold text-ink">{item.title}</span> — {item.desc}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-lg font-medium leading-[1.85] text-sub">
            {s.worryTail}
          </p>
        </section>

        {/* 왜 Glocalizer인가요 */}
        <section className="mt-20">
          <SectionHeading>{s.whyHead}</SectionHeading>
          <ul className="mt-6 space-y-4 text-lg font-medium leading-[1.85] text-sub">
            {s.whys.map(item => (
              <li key={item.title} className="flex gap-3">
                <span aria-hidden className="text-brand">•</span>
                <span>
                  <span className="font-extrabold text-ink">{item.title}</span> — {item.desc}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Glocalizer가 대신 해드려요 */}
        <section className="mt-20">
          <h2 className="text-[28px] font-extrabold tracking-tight sm:text-[32px]">
            {s.doHead} <span className="text-brand">{s.doAccent}</span>
          </h2>
          <p className="mt-6 text-lg font-medium leading-[1.85] text-sub">
            {s.do1}
          </p>
          <p className="mt-3 text-lg font-medium leading-[1.85] text-sub">
            {s.do2}
          </p>

          <div className="mt-10 overflow-hidden rounded-[32px] bg-[#FAFBFC] p-8 sm:p-14">
            <img src={ABOUT_IMG[lang] ?? aboutKR} alt={s.proAlt} className="w-full" />
          </div>
        </section>

        {/* 핵심 기능 3가지 */}
        <section className="mt-20">
          <h2 className="text-[28px] font-extrabold tracking-tight sm:text-[32px]">
            {s.featHead} <span className="text-brand">{s.featAccent}</span>
          </h2>

          {s.features.map((item, index) => (
            <div key={item.title} className={index === 0 ? 'mt-8' : 'mt-10'}>
              <h3 className="flex items-center gap-2.5 text-xl font-extrabold text-ink sm:text-2xl">
                {item.title}
                <img src={FEATURE_ICONS[index]} alt="" aria-hidden className="h-6 w-6" />
              </h3>
              <p className="mt-2.5 text-lg font-medium leading-[1.85] text-sub">
                {item.desc}
              </p>
            </div>
          ))}
        </section>
      </main>

      <div className="h-16 w-full bg-surface sm:h-20" />

      <section className="mx-auto w-full max-w-[960px] px-6 py-20 sm:px-10">
        <h2 className="flex items-center gap-2.5 text-[28px] font-extrabold tracking-tight sm:text-[32px]">
          {s.videoHead}
          <img src={iconYoutube} alt="" aria-hidden className="h-7 w-7" />
        </h2>

        {/* 플랫폼 사용 방법 소개 영상 — corner radius는 버튼(rounded-2xl)과 동일 */}
        <div className="mx-auto mt-10 max-w-[600px] overflow-hidden rounded-2xl border-2 border-gray-200">
          <video
            src={introduceVideo}
            className="w-full"
            controls
            autoPlay
            muted
            loop
            playsInline
          />
        </div>
      </section>

      <Footer />
    </div>
  )
}
