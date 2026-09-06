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
      className="flex min-h-screen flex-col"
      style={{ '--hero-bg': `url(${heroGradient})` } as CSSProperties}
    >
      {/* PC에서는 헤더까지 그라데이션 카드 안에 넣고, 모바일에서는 흰 헤더 + 카드 분리를 유지한다. */}
      <div className="flex flex-1 flex-col lg:p-6">
        <div className="flex flex-1 flex-col lg:rounded-[20px] lg:bg-[image:var(--hero-bg)] lg:bg-cover lg:bg-center">
          <Header center={<NavMenu />} sticky overlay />

          <main className="flex w-full flex-1 flex-col p-4 sm:p-6 lg:p-0">
            <section
              className="relative grid flex-1 content-center gap-10 rounded-[20px] bg-[image:var(--hero-bg)] bg-cover bg-center px-6 py-10 sm:gap-14 sm:px-12 sm:py-14 lg:grid-cols-[1fr_1.78fr] lg:content-stretch lg:items-center lg:rounded-none lg:bg-none lg:pt-20 lg:pr-20 lg:pb-0 lg:pl-16"
            >
              <div className="lg:self-center">
                <h1 className="text-[42px] leading-[1.12] font-extrabold tracking-tight sm:text-5xl md:text-[60px]">
                  {t.heroLine1}
                  <br />
                  <span className="text-brand">{t.heroLine2}</span>
                </h1>
                <p className={`mt-5 max-w-[420px] font-medium text-sub sm:mt-6 sm:text-[17px] ${
                  lang === 'ko' ? 'whitespace-nowrap text-[13px] min-[360px]:text-[14px]' : 'text-[15px]'
                }`}>
                  {t.heroDesc}
                </p>
                <Button size="lg" onClick={() => navigate('/dashboard')} className="mt-7 w-full sm:mt-8 sm:w-auto">
                  {t.heroCta}
                </Button>

              </div>

              <div className="overflow-hidden rounded-[24px] bg-white shadow-sm sm:rounded-[32px] lg:ml-auto lg:aspect-[1078/675] lg:w-full lg:self-end lg:rounded-b-none">
                <video
                  ref={videoRef}
                  src={motionGraphic}
                  className="block aspect-[16/9] w-full object-cover lg:h-full lg:aspect-auto"
                  autoPlay
                  muted
                  playsInline
                  preload="metadata"
                  aria-label={t.cardTitle}
                />
              </div>

              {/* 영상 되감기 — 목업대로 히어로 오른쪽 아래에 띄운다. */}
              <button
                type="button"
                onClick={replayVideo}
                aria-label={t.heroReplay}
                title={t.heroReplay}
                className="absolute right-6 bottom-6 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur transition hover:bg-white focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-none lg:right-5 lg:bottom-6"
              >
                <img src={refreshIcon} alt="" aria-hidden className="h-5 w-5" />
              </button>
            </section>
          </main>
        </div>
      </div>

      <Footer />
    </div>
  )
}
