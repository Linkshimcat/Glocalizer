import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Footer from '../components/Footer'
import Header from '../components/Header'
import NavMenu from '../components/NavMenu'
import RollingText from '../components/RollingText'
import heroGradient from '../assets/LendingPage/GreenBackground-web.jpg'
import motionGraphic from '../assets/LendingPage/MotionGrap.mp4'
import refreshIcon from '../assets/LendingPage/refreshButton.svg'
import { useSiteLang } from '../i18n/LanguageContext'

export default function Landing() {
  const navigate = useNavigate()
  const { t, lang } = useSiteLang()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [progress, setProgress] = useState(0)

  // 모션그래픽은 한 번만 재생하고 멈춘다. 되감기 버튼으로 처음부터 다시 본다.
  const replayVideo = () => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = 0
    void video.play()
  }

  // 진행 바는 timeupdate(초당 4회)로는 끊겨 보여서 재생 중에만 rAF로 따라간다.
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let frame = 0
    const sync = () => {
      if (video.duration > 0) setProgress(Math.min(video.currentTime / video.duration, 1))
    }
    const loop = () => {
      sync()
      frame = requestAnimationFrame(loop)
    }
    const start = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(loop)
    }
    const stop = () => {
      cancelAnimationFrame(frame)
      sync()
    }

    video.addEventListener('play', start)
    video.addEventListener('pause', stop)
    video.addEventListener('ended', stop)
    video.addEventListener('seeked', sync)
    if (!video.paused) start()

    return () => {
      cancelAnimationFrame(frame)
      video.removeEventListener('play', start)
      video.removeEventListener('pause', stop)
      video.removeEventListener('ended', stop)
      video.removeEventListener('seeked', sync)
    }
  }, [])

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
                {/* 굴러가는 어절은 aria-hidden이라 읽히는 문구를 따로 남긴다. */}
                <span className="sr-only">{t.heroLine2}</span>
                <RollingText items={t.heroLine2Roll} className="text-brand" />
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
              {/* 타임라인은 전 화면에서 보인다. 되감기 버튼은 좁은 화면에서 이 줄 끝에 붙고,
                  lg부터는 목업대로 히어로 오른쪽 아래로 빠진다(기준점은 relative인 section). */}
              <div className="flex items-center gap-3 font-extrabold text-ink sm:gap-4">
                <span aria-hidden="true" className="text-[13px] sm:text-[15px]">01</span>
                <span aria-hidden="true" className="relative h-1 flex-1 overflow-hidden rounded-full bg-ink/15">
                  <span
                    className="absolute inset-y-0 left-0 rounded-full bg-ink"
                    style={{ width: `${progress * 100}%` }}
                  />
                </span>
                <span aria-hidden="true" className="text-[13px] sm:text-[15px]">03</span>
                <button
                  type="button"
                  onClick={replayVideo}
                  aria-label={t.heroReplay}
                  title={t.heroReplay}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur transition hover:bg-white focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-none lg:absolute lg:right-6 lg:bottom-6"
                >
                  <img src={refreshIcon} alt="" aria-hidden className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
