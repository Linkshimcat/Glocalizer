import { ArrowDown, ArrowRight } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import heroCharacter from '../assets/studio/hero-character.png'
import translationStrip from '../assets/studio/translation-strip.png'
import motionGraphic from '../assets/LandingAssets/MotionGrap.mp4'
import refreshIcon from '../assets/LandingAssets/refreshButton.svg'
import macbookFrame from '../assets/LandingAssets/macbook_mockup_transparent.png'
import iphoneFrame from '../assets/LandingAssets/iphone_17_pro_transparent.png'
import generatePhoneCapture from '../assets/LandingAssets/phone-captures/generate-project-ko.png'
import localizePhoneCapture from '../assets/LandingAssets/phone-captures/localize-upload-ko.png'
import reviewPhoneCapture from '../assets/LandingAssets/phone-captures/review-projects-ko.png'
import generateDesktopCapture from '../assets/LandingAssets/desktop-captures/generate-project-ko.png'
import localizeDesktopCapture from '../assets/LandingAssets/desktop-captures/localize-upload-ko.png'
import reviewDesktopCapture from '../assets/LandingAssets/desktop-captures/review-projects-ko.png'
import workflowCreateVisual from '../assets/LandingAssets/Gen.png'
import workflowLocalizeVisual from '../assets/LandingAssets/Local.png'
import workflowReviewVisual from '../assets/LandingAssets/check.png'
import Button from '../components/Button'
import Footer from '../components/Footer'
import OgqStickerGallery from '../components/OgqStickerGallery'
import RollingText from '../components/RollingText'
import '../landing.css'
import { useSiteLang } from '../i18n/LanguageContext'
import { getLandingShowcases, type LandingShowcase } from '../lib/api'
import type { Dict, SiteLang } from '../i18n/translations'

type SceneCopy = {
  title: string
  description: string
  linkLabel: string
}

type RemakeCopy = {
  heroDescription: string
  heroCta: string
  scrollLabel: string
  translationAlt: string
  languageLabels: [string, string, string]
  workflowTitle: string
  workflowDescription: string
  scenes: [SceneCopy, SceneCopy, SceneCopy]
  caseTitle: string
  caseDescription: string
  caseOriginal: string
  caseLocalizationResult: string
  caseGenerationResult: string
  caseCompareLabel: string
  caseLocalization: string
  caseGeneration: string
  finalTitle: string
  finalDescription: string
  finalCta: string
}

const WORKFLOW_VISUALS = [workflowCreateVisual, workflowLocalizeVisual, workflowReviewVisual]

const COPY: Record<SiteLang, RemakeCopy> = {
  "ko": {
    "heroDescription": "이모티콘 생성·현지화·출시 전 검토를 지원합니다.",
    "heroCta": "작업실 열기",
    "scrollLabel": "둘러보기",
    "translationAlt": "한국어·영어·일본어로 인사하는 캐릭터",
    "languageLabels": [
      "한국어",
      "영어",
      "일본어"
    ],
    "workflowTitle": "이모티콘 작업 과정",
    "workflowDescription": "필요한 단계부터 시작할 수 있습니다.",
    "scenes": [
      {
        "title": "이모티콘 생성",
        "description": "캐릭터와 표정 설명으로 이모티콘을 생성합니다.",
        "linkLabel": "생성 시작하기"
      },
      {
        "title": "다국어 현지화",
        "description": "한국어 문구를 영어·일본어·중국어로 현지화합니다.",
        "linkLabel": "현지화 시작하기"
      },
      {
        "title": "출시 전 검토",
        "description": "OGQ 규격과 이미지·문구를 확인합니다.",
        "linkLabel": "검토 시작하기"
      }
    ],
    "caseTitle": "작업 결과",
    "caseDescription": "사용 허락을 받은 실제 작업물입니다.",
    "caseOriginal": "원본",
    "caseLocalizationResult": "현지화 결과",
    "caseGenerationResult": "생성 결과",
    "caseCompareLabel": "원본과 작업 결과 비교",
    "caseLocalization": "현지화",
    "caseGeneration": "생성",
    "finalTitle": "이모티콘 작업을 시작하세요",
    "finalDescription": "생성부터 출시 전 검토까지 한곳에서 진행합니다.",
    "finalCta": "작업실 열기"
  },
  "en": {
    "heroDescription": "Create stickers. Localize captions. Review before release.",
    "heroCta": "Open studio",
    "scrollLabel": "Explore",
    "translationAlt": "A character greeting in Korean, English and Japanese",
    "languageLabels": [
      "Korean",
      "English",
      "Japanese"
    ],
    "workflowTitle": "The sticker workflow",
    "workflowDescription": "Start with the step you need.",
    "scenes": [
      {
        "title": "Sticker creation",
        "description": "Generate stickers from character and expression descriptions.",
        "linkLabel": "Start creating"
      },
      {
        "title": "Caption localization",
        "description": "Adapt Korean captions into English, Japanese and Chinese.",
        "linkLabel": "Start localizing"
      },
      {
        "title": "Pre-release review",
        "description": "Check OGQ specifications, images and captions.",
        "linkLabel": "Start reviewing"
      }
    ],
    "caseTitle": "Project results",
    "caseDescription": "Real projects shared with permission.",
    "caseOriginal": "Original",
    "caseLocalizationResult": "Localized result",
    "caseGenerationResult": "Generated result",
    "caseCompareLabel": "Compare original and result",
    "caseLocalization": "Localization",
    "caseGeneration": "Generation",
    "finalTitle": "Start your sticker project",
    "finalDescription": "Create and prepare your stickers for release in one workspace.",
    "finalCta": "Open studio"
  },
  "ja": {
    "heroDescription": "スタンプ生成・ローカライズ・公開前チェックを支援します。",
    "heroCta": "スタジオを開く",
    "scrollLabel": "見る",
    "translationAlt": "韓国語・英語・日本語で挨拶するキャラクター",
    "languageLabels": [
      "韓国語",
      "英語",
      "日本語"
    ],
    "workflowTitle": "スタンプの制作手順",
    "workflowDescription": "必要なステップから始められます。",
    "scenes": [
      {
        "title": "スタンプ生成",
        "description": "キャラクターと表情の説明からスタンプを生成します。",
        "linkLabel": "生成を始める"
      },
      {
        "title": "多言語ローカライズ",
        "description": "韓国語の文言を英語・日本語・中国語に変換します。",
        "linkLabel": "ローカライズを始める"
      },
      {
        "title": "公開前チェック",
        "description": "OGQの規格と画像・文言を確認します。",
        "linkLabel": "チェックを始める"
      }
    ],
    "caseTitle": "制作結果",
    "caseDescription": "掲載許可を得た実際の制作例です。",
    "caseOriginal": "オリジナル",
    "caseLocalizationResult": "ローカライズ結果",
    "caseGenerationResult": "生成結果",
    "caseCompareLabel": "オリジナルと制作結果を比較",
    "caseLocalization": "ローカライズ",
    "caseGeneration": "生成",
    "finalTitle": "スタンプ制作を始めましょう",
    "finalDescription": "生成から公開前チェックまでひとつの場所で進めます。",
    "finalCta": "スタジオを開く"
  },
  "zh": {
    "heroDescription": "支持表情生成、多语言本地化和发布前检查。",
    "heroCta": "打开工作室",
    "scrollLabel": "浏览",
    "translationAlt": "用韩语、英语和日语打招呼的角色",
    "languageLabels": [
      "韩语",
      "英语",
      "日语"
    ],
    "workflowTitle": "表情制作流程",
    "workflowDescription": "从需要的步骤开始。",
    "scenes": [
      {
        "title": "表情生成",
        "description": "根据角色和表情描述生成图片。",
        "linkLabel": "开始生成"
      },
      {
        "title": "多语言本地化",
        "description": "将韩语文案转换为英语、日语和中文。",
        "linkLabel": "开始本地化"
      },
      {
        "title": "发布前检查",
        "description": "检查OGQ规格、图片和文案。",
        "linkLabel": "开始检查"
      }
    ],
    "caseTitle": "项目成果",
    "caseDescription": "经授权展示的真实作品。",
    "caseOriginal": "原作",
    "caseLocalizationResult": "本地化结果",
    "caseGenerationResult": "生成结果",
    "caseCompareLabel": "对比原作与制作结果",
    "caseLocalization": "本地化",
    "caseGeneration": "生成",
    "finalTitle": "开始制作您的表情",
    "finalDescription": "在一个工作室完成生成到发布前检查。",
    "finalCta": "打开工作室"
  }
}

/** Native controls keep playback and seeking available in every motion mode. */
function VideoIntro({ reduceMotion, t }: { reduceMotion: boolean; t: Dict }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const automaticPauseRef = useRef(false)
  const userPausedRef = useRef(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    let visible = false
    const syncPlayback = () => {
      if (!visible || document.hidden || reduceMotion) {
        if (!video.paused) {
          automaticPauseRef.current = true
          video.pause()
        }
      } else if (!userPausedRef.current && !video.ended) {
        void video.play().catch(() => { /* Native controls remain available if autoplay is blocked. */ })
      }
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio >= 0.5
      syncPlayback()
    }, { threshold: [0, 0.5] })
    observer.observe(video)
    document.addEventListener('visibilitychange', syncPlayback)
    syncPlayback()
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', syncPlayback)
    }
  }, [reduceMotion])

  const replay = () => {
    const video = videoRef.current
    if (!video) return
    userPausedRef.current = false
    video.currentTime = 0
    void video.play().catch(() => { /* The user can retry using the native play control. */ })
  }

  return (
    <section className="remake-video-intro" aria-labelledby="landing-video-title">
      <div className="remake-video-heading">
        <h2 id="landing-video-title">{t.landingVideoTitle}</h2>
        <p>{t.landingVideoDescription}</p>
      </div>
      <video
        ref={videoRef}
        className="remake-intro-video"
        src={motionGraphic}
        width={1920}
        height={1080}
        controls
        muted
        playsInline
        preload="metadata"
        aria-label={t.landingVideoTitle}
        aria-describedby="landing-video-hint"
        onPlay={() => { userPausedRef.current = false }}
        onPause={(event) => {
          if (!automaticPauseRef.current && !event.currentTarget.ended) userPausedRef.current = true
          automaticPauseRef.current = false
        }}
      />
      <div className="remake-video-footer">
        <p id="landing-video-hint">{reduceMotion ? t.landingVideoManualHint : t.landingVideoAutoHint}</p>
        <button type="button" onClick={replay} className="remake-video-replay">
          <img src={refreshIcon} alt="" aria-hidden />{t.heroReplay}
        </button>
      </div>
    </section>
  )
}

function LiveProductScreen({ lang, title, scene, phoneCapture, desktopCapture }: { lang: SiteLang; title: string; scene: number; phoneCapture?: string; desktopCapture?: string }) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [scale, setScale] = useState(1)
  const width = isMobile ? 390 : 1000
  const height = isMobile ? 844 : 650
  const capture = isMobile ? phoneCapture : desktopCapture
  const screenRoute = ['/generate', '/localize', '/review'][scene]

  useEffect(() => {
    const media = window.matchMedia('(max-width: 900px)')
    const syncViewport = () => setIsMobile(media.matches)
    syncViewport()
    media.addEventListener('change', syncViewport)
    return () => media.removeEventListener('change', syncViewport)
  }, [])

  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    const observer = new ResizeObserver(([entry]) => {
      setScale(Math.min(entry.contentRect.width / width, entry.contentRect.height / height))
    })
    observer.observe(frame)
    return () => observer.disconnect()
  }, [width, height])

  return (
    <div ref={frameRef} className="remake-product-window" data-lang={lang} data-captured={Boolean(capture)}>
      {!capture && <iframe
        key={`${lang}-${width}-${screenRoute}`}
        src={screenRoute}
        title={title}
        className="remake-product-screen remake-product-live"
        style={{ width, height, transform: `scale(${scale})` }}
        loading="eager"
        tabIndex={-1}
      />}
      {capture && <img src={capture} alt={title} className={`remake-product-screen remake-product-capture${isMobile ? '' : ' remake-product-capture-desktop'}`} />}
    </div>
  )
}

function ShowcaseCompare({ item, copy }: { item: LandingShowcase; copy: RemakeCopy }) {
  const [position, setPosition] = useState(50)
  const isLocalization = item.kind === 'localization'
  const resultLabel = isLocalization ? copy.caseLocalizationResult : copy.caseGenerationResult

  return (
    <article className="remake-case-card">
      <div className="remake-case-meta"><span>{isLocalization ? copy.caseLocalization : copy.caseGeneration}</span>{item.languageCode && <span>{item.languageCode.toUpperCase()}</span>}</div>
      <div className="remake-case-compare">
        <img src={item.originalUrl} alt={copy.caseOriginal} loading="lazy" />
        <img src={item.resultUrl} alt={resultLabel} loading="lazy" style={{ clipPath: `inset(0 0 0 ${position}%)` }} />
        <span className="remake-case-label remake-case-label-before">{copy.caseOriginal}</span>
        <span className="remake-case-label remake-case-label-after">{resultLabel}</span>
        <span className="remake-case-divider" style={{ left: `${position}%` }} aria-hidden><i /></span>
        <input
          type="range"
          min="0"
          max="100"
          value={position}
          aria-label={copy.caseCompareLabel}
          onChange={(event) => setPosition(Number(event.target.value))}
          style={{ '--case-position': `${position}%` } as CSSProperties}
        />
      </div>
    </article>
  )
}

export default function LandingRemake() {
  const navigate = useNavigate()
  const { lang, t } = useSiteLang()
  const copy = COPY[lang]
  const pageRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLElement>(null)
  const [heroMotionPaused, setHeroMotionPaused] = useState(false)
  const storyRef = useRef<HTMLElement>(null)
  const workflowGridRef = useRef<HTMLDivElement>(null)
  const [reduceMotion, setReduceMotion] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [compactStory, setCompactStory] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-height: 650px) and (max-width: 900px)').matches)
  const staticStory = reduceMotion || compactStory
  const [scene, setScene] = useState(0)
  const [workflowVisible, setWorkflowVisible] = useState<boolean[]>([false, false, false])
  const [activeWorkflowIndex, setActiveWorkflowIndex] = useState(0)
  const [showcases, setShowcases] = useState<LandingShowcase[]>([])

  useEffect(() => {
    const hero = heroRef.current
    if (!hero) return
    let visible = true
    const sync = () => setHeroMotionPaused(!visible || document.hidden)
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync() })
    observer.observe(hero)
    document.addEventListener('visibilitychange', sync)
    sync()
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', sync) }
  }, [])

  useEffect(() => {
    const root = pageRef.current
    const header = document.querySelector('.site-header')
    if (!root || !header) return
    const sync = () => root.style.setProperty('--main-header-height', `${header.getBoundingClientRect().height}px`)
    sync()
    const observer = new ResizeObserver(sync)
    observer.observe(header)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    let active = true
    void getLandingShowcases().then((items) => { if (active) setShowcases(items) }).catch(() => { if (active) setShowcases([]) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const compact = window.matchMedia('(max-height: 650px) and (max-width: 900px)')
    const update = () => setReduceMotion(media.matches)
    const updateCompact = () => setCompactStory(compact.matches)
    media.addEventListener('change', update)
    compact.addEventListener('change', updateCompact)
    return () => { media.removeEventListener('change', update); compact.removeEventListener('change', updateCompact) }
  }, [])

  useEffect(() => {
    if (staticStory) return
    let frame = 0
    const syncScenes = () => {
      frame = 0
      const story = storyRef.current
      if (!story) return
      const rect = story.getBoundingClientRect()
      const headerHeight = document.querySelector('.site-header')?.getBoundingClientRect().height ?? 72
      const travel = Math.max(story.offsetHeight - window.innerHeight + headerHeight, 1)
      const progress = Math.min(Math.max((headerHeight - rect.top) / travel, 0), 1)
      const nextScene = Math.min(Math.floor(progress * 3), 2)
      setScene((current) => current === nextScene ? current : nextScene)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(syncScenes)
    }
    syncScenes()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [staticStory])

  useEffect(() => {
    const grid = workflowGridRef.current
    if (reduceMotion || !grid || !('IntersectionObserver' in window)) {
      setWorkflowVisible([true, true, true])
      return
    }

    const cards = Array.from(grid.children)
    const observer = new IntersectionObserver((entries) => {
      const visibleEntries = entries.filter(entry => entry.isIntersecting)
      for (const entry of visibleEntries) {
        const index = cards.indexOf(entry.target)
        if (index >= 0) setWorkflowVisible(current => current[index] ? current : current.map((visible, cardIndex) => visible || cardIndex === index))
      }

      const centeredEntry = visibleEntries
        .filter(entry => entry.intersectionRatio >= 0.35)
        .sort((a, b) => Math.abs(a.boundingClientRect.top + a.boundingClientRect.height / 2 - window.innerHeight / 2) - Math.abs(b.boundingClientRect.top + b.boundingClientRect.height / 2 - window.innerHeight / 2))[0]
      const activeIndex = centeredEntry ? cards.indexOf(centeredEntry.target) : -1
      if (activeIndex >= 0) setActiveWorkflowIndex(activeIndex)
    }, { threshold: [0.15, 0.35, 0.6] })

    cards.forEach(card => observer.observe(card))
    return () => observer.disconnect()
  }, [reduceMotion])

  const jumpToStory = () => {
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    storyRef.current?.scrollIntoView({ behavior })
  }

  const renderStoryScene = (index: number) => (
    <div className="remake-story-scene" key={index}>
      <div className="remake-scene-copy" key={`${lang}-${index}`}>
        <h2>{copy.scenes[index].title.split('\n').map(line => <span key={line}>{line}</span>)}</h2>
        <div>{copy.scenes[index].description}</div>
        <div className="remake-scene-progress" aria-hidden>
          {copy.scenes.map((item, step) => <span key={item.title} data-active={step <= index} />)}
        </div>
      </div>
      <div className="remake-device-wrap">
        <div className="remake-device">
          <LiveProductScreen
            key={index}
            lang={lang}
            title={copy.scenes[index].title.replace('\n', ' ')}
            scene={index}
            phoneCapture={lang === 'ko' ? [generatePhoneCapture, localizePhoneCapture, reviewPhoneCapture][index] : undefined}
            desktopCapture={lang === 'ko' ? [generateDesktopCapture, localizeDesktopCapture, reviewDesktopCapture][index] : undefined}
          />
          <img src={macbookFrame} alt="" aria-hidden className="remake-device-frame remake-device-frame-desktop" />
          <img src={iphoneFrame} alt="" aria-hidden className="remake-device-frame remake-device-frame-mobile" />
        </div>
      </div>
    </div>
  )

  return (
    <div ref={pageRef} className="remake-page main-restyle" data-lang={lang}>
      <main>
        <section ref={heroRef} className="remake-hero" data-lang={lang} data-motion-paused={heroMotionPaused}>
          <div className="remake-hero-inner">
            <h1 key={`title-${lang}`}>
              <span className="sr-only">{t.heroLine1} {t.heroLine2}</span>
              <span aria-hidden="true" className="remake-hero-prefix">{t.heroLine1}</span>
              <RollingText items={t.heroLine2Roll} className="remake-hero-roll" />
            </h1>
            <p key={`description-${lang}`} className="remake-hero-description">{copy.heroDescription}</p>
            <div className="remake-hero-actions">
              <Button size="lg" onClick={() => navigate('/dashboard')}>{copy.heroCta}<ArrowRight size={18} /></Button>
              <button type="button" onClick={jumpToStory} className="remake-scroll-button">{copy.scrollLabel}<ArrowDown size={17} /></button>
            </div>
          </div>
          <img src={heroCharacter} alt="" width={1391} height={1131} fetchPriority="high" className="remake-hero-art" />
        </section>

        <figure className="remake-translation-strip">
          <img src={translationStrip} alt={copy.translationAlt} width={2172} height={724} />
          <figcaption>{copy.languageLabels.map(label => <span key={label}>{label}</span>)}</figcaption>
        </figure>

        <VideoIntro reduceMotion={reduceMotion} t={t} />

        <section ref={storyRef} className="remake-story" data-lang={lang} data-static={staticStory} aria-label={copy.workflowTitle}>
          {staticStory ? copy.scenes.map((_, index) => renderStoryScene(index)) : (
            <div className="remake-story-sticky">{renderStoryScene(scene)}</div>
          )}
        </section>

        <section className="remake-workflow">
          <div className="remake-workflow-heading"><h2>{copy.workflowTitle}</h2><p>{copy.workflowDescription}</p></div>
          <div ref={workflowGridRef} className="remake-workflow-grid" data-motion-ready="true">
            {copy.scenes.map((item, index) => (
              <article
                key={item.title}
                data-visible={workflowVisible[index]}
                data-active={activeWorkflowIndex === index}
                style={{ '--workflow-delay': `${index * 120}ms` } as CSSProperties}
                onPointerDown={() => setActiveWorkflowIndex(index)}
              >
                <img src={WORKFLOW_VISUALS[index]} alt="" width={201} height={201} loading="lazy" decoding="async" className="remake-workflow-visual" />
                <h3>{item.title.split('\n').map((line) => <span key={line}>{line}</span>)}</h3>
                <div>{item.description}</div>
                <Link to={['/generate', '/localize', '/review'][index]} className="remake-workflow-link" onFocus={() => setActiveWorkflowIndex(index)}>{item.linkLabel}<ArrowRight size={17} /></Link>
              </article>
            ))}
          </div>
        </section>

        {showcases.length > 0 && <section className="remake-cases">
          <div className="remake-cases-heading"><h2>{copy.caseTitle}</h2><p>{copy.caseDescription}</p></div>
          <div className="remake-case-grid">{showcases.map((item) => <ShowcaseCompare key={item.id} item={item} copy={copy} />)}</div>
        </section>}

        <div className="remake-ogq-proof"><OgqStickerGallery /></div>

        <section className="remake-final">
          <h2>{copy.finalTitle.split('\n').map((line) => <span key={line}>{line}</span>)}</h2>
          <p>{copy.finalDescription}</p>
          <Button size="lg" onClick={() => navigate('/dashboard')}>{copy.finalCta}<ArrowRight size={18} /></Button>
        </section>
      </main>
      <Footer />
    </div>
  )
}
