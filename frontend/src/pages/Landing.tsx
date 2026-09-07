import { useRef, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Footer from '../components/Footer'
import Header from '../components/Header'
import NavMenu from '../components/NavMenu'
import heroGradient from '../assets/LendingPage/GreenBackground-web.jpg'
import motionGraphic from '../assets/LendingPage/MotionGrap.mp4'
import refreshIcon from '../assets/LendingPage/refreshButton.svg'
import { useSiteLang } from '../i18n/LanguageContext'

export default function Landing() {
  const navigate = useNavigate()
  const { t, lang } = useSiteLang()
  const videoRef = useRef<HTMLVideoElement>(null)

  // 모션그래픽은 한 번만 재생하고 멈춘다. 되감기 버튼으로 처음부터 다시 본다.
  const replayVideo = () => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = 0
    void video.play()
  }

  return (
    <div
      className="flex min-h-svh flex-col"
      style={{ '--hero-bg': `url(${heroGradient})` } as CSSProperties}
    >
      {/* NAV는 Hero와 독립된 흰색 바. gradient는 Hero section 안에서만 보인다. */}
      <Header center={<NavMenu />} sticky />

      <main className="flex w-full flex-1 flex-col">
        <section className="relative flex w-full flex-1 flex-col justify-center overflow-hidden bg-[image:var(--hero-bg)] bg-cover bg-center">
          <div className="mx-auto grid w-full max-w-[1600px] content-center gap-10 px-5 py-8 sm:gap-12 sm:px-10 sm:py-14 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center lg:gap-16 lg:px-16 lg:py-10">
            <div>
              <h1 className="text-[42px] leading-[1.12] font-extrabold tracking-tight sm:text-5xl md:text-[60px]">
                {t.heroLine1}
                <br />
                <span className="text-brand">{t.heroLine2}</span>
              </h1>
              <p className={`mt-6 max-w-[420px] font-medium text-sub sm:text-[17px] ${
                lang === 'ko' ? 'whitespace-nowrap text-[13px] min-[360px]:text-[14px] lg:whitespace-pre-line' : 'text-[15px]'
              }`}>
                {t.heroDesc}
              </p>
              <Button size="lg" onClick={() => navigate('/dashboard')} className="mt-7 w-full sm:mt-8 sm:w-auto">
                {t.heroCta} <span aria-hidden="true">→</span>
              </Button>
            </div>

            <div className="flex w-full flex-col gap-6 lg:max-w-[900px] lg:justify-self-end lg:self-center">
              <div className="overflow-hidden rounded-[24px] border border-black/[0.06] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
                <video
                  ref={videoRef}
                  src={motionGraphic}
                  className="block aspect-video w-full object-cover"
                  autoPlay
                  muted
                  playsInline
                  preload="metadata"
                  aria-label={t.cardTitle}
                />
              </div>
              <div className="hidden items-center gap-4 font-extrabold text-ink lg:flex">
                <span className="text-[15px]">01</span>
                <span aria-hidden="true" className="h-1 flex-1 rounded-full bg-ink" />
                <span className="text-[15px]">03</span>
              </div>
            </div>

              {/* 영상 되감기 — 목업대로 히어로 오른쪽 아래에 띄운다. */}
              <button
                type="button"
                onClick={replayVideo}
                aria-label={t.heroReplay}
                title={t.heroReplay}
                className="absolute right-6 bottom-6 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur transition hover:bg-white focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <img src={refreshIcon} alt="" aria-hidden className="h-5 w-5" />
              </button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
