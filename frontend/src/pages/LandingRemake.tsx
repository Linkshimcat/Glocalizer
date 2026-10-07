import { ArrowDown, ArrowRight } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import heroCharacter from '../assets/studio/hero-character.png'
import translationStrip from '../assets/studio/translation-strip.png'
import motionGraphic from '../assets/LandingAssets/MotionGrap.mp4'
import refreshIcon from '../assets/LandingAssets/refreshButton.svg'
import macbookFrame from '../assets/LandingAssets/macbook_mockup_transparent.png'
import iphoneFrame from '../assets/LandingAssets/iphone_17_pro_transparent.png'
import ogqGalleryReference from '../assets/LandingAssets/ogq-gallery-reference.jpg'
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
import AccountMenu from '../components/AccountMenu'
import Footer from '../components/Footer'
import Header from '../components/Header'
import LanguageSelect from '../components/LanguageSelect'
import OgqStickerGallery from '../components/OgqStickerGallery'
import '../landing.css'
import { useSiteLang } from '../i18n/LanguageContext'
import { getLandingShowcases, type LandingShowcase } from '../lib/api'
import { useAuth } from '../store/AuthContext'
import type { Dict, SiteLang } from '../i18n/translations'

type SceneCopy = {
  kicker: string
  title: string
  description: string
  linkLabel: string
}

type RemakeCopy = {
  heroTitle: string
  heroDescription: string
  heroCta: string
  scrollLabel: string
  translationAlt: string
  languageLabels: [string, string, string]
  workflowEyebrow: string
  workflowTitle: string
  workflowDescription: string
  scenes: [SceneCopy, SceneCopy, SceneCopy]
  caseEyebrow: string
  caseTitle: string
  caseDescription: string
  caseOriginal: string
  caseLocalizationResult: string
  caseGenerationResult: string
  caseCompareLabel: string
  caseLocalization: string
  caseGeneration: string
  finalEyebrow: string
  finalTitle: string
  finalDescription: string
  finalCta: string
}

const WORKFLOW_VISUALS = [workflowCreateVisual, workflowLocalizeVisual, workflowReviewVisual]

const COPY: Record<SiteLang, RemakeCopy> = {
  ko: {
    heroTitle: '아이디어에서\n전 세계의 이모티콘까지,\nGlocalizer와 함께.',
    heroDescription: '새로운 이모티콘을 만들고, 여러 언어로 다듬고, 출시 전까지 확인해요. 창작에 필요한 흐름을 한곳에서 이어 보세요.',
    heroCta: 'Glocalizer 시작하기', scrollLabel: '둘러보기',
    translationAlt: '한국어, 영어, 일본어로 인사하는 캐릭터', languageLabels: ['한국어', '영어', '일본어'],
    workflowEyebrow: 'CREATE · LOCALIZE · REVIEW', workflowTitle: '아이디어부터 출시 준비까지', workflowDescription: '창작의 각 단계를 한곳에서 이어 가세요.',
    scenes: [
      { kicker: '01 · CREATE', title: '아이디어를\n이모티콘으로', description: '만들고 싶은 캐릭터와 표정을 바탕으로 새 이모티콘을 생성해요.', linkLabel: '생성 시작하기' },
      { kicker: '02 · LOCALIZE', title: '작품의 감정을\n다른 언어로', description: '원본의 분위기를 살려 영어·일본어·중국어 문구를 만들고 직접 다듬어요.', linkLabel: '현지화 시작하기' },
      { kicker: '03 · REVIEW', title: '출시 준비를\n꼼꼼하게 확인', description: 'OGQ 기준에 맞춰 이미지와 문구를 검토하고 출시를 준비해요.', linkLabel: '검토 시작하기' },
    ],
    caseEyebrow: 'REAL WORK · 실제 작업 사례', caseTitle: '실제 작업 결과를 비교해 보세요', caseDescription: '사용 허락을 받은 Glocalizer 작업물을 직접 비교해 보세요.', caseOriginal: '원본', caseLocalizationResult: '현지화 결과', caseGenerationResult: '생성 결과', caseCompareLabel: '원본과 작업 결과 비교', caseLocalization: '현지화', caseGeneration: '생성',
    finalEyebrow: '이제 당신의 차례예요', finalTitle: '다음 이모티콘을\n함께 완성해요.', finalDescription: 'Glocalizer에서 아이디어를 만들고, 다듬고, 출시를 준비해 보세요.', finalCta: '작업실 열기',
  },
  en: {
    heroTitle: 'From an idea,\nto emoticons worldwide,\nwith Glocalizer.',
    heroDescription: 'Create new emoticons, refine them for other languages, and get ready to release—all in one creative workflow.',
    heroCta: 'Start Glocalizer', scrollLabel: 'Explore',
    translationAlt: 'A character greeting in Korean, English, and Japanese', languageLabels: ['Korean', 'English', 'Japanese'],
    workflowEyebrow: 'CREATE · LOCALIZE · REVIEW', workflowTitle: 'From idea to release-ready', workflowDescription: 'Move through every stage of creating in one place.',
    scenes: [
      { kicker: '01 · CREATE', title: 'Turn an idea into\nan emoticon', description: 'Create new emoticons from your character and expression ideas.', linkLabel: 'Start creating' },
      { kicker: '02 · LOCALIZE', title: 'Carry the feeling\ninto new languages', description: 'Keep the original tone while adapting captions into English, Japanese, and Chinese.', linkLabel: 'Start localizing' },
      { kicker: '03 · REVIEW', title: 'Get ready\nfor release', description: 'Review your images and captions against OGQ requirements before release.', linkLabel: 'Start reviewing' },
    ],
    caseEyebrow: 'REAL WORK · CREATOR CASES', caseTitle: 'See real work come together', caseDescription: 'Compare real Glocalizer work shared with permission.', caseOriginal: 'Original', caseLocalizationResult: 'Localized result', caseGenerationResult: 'Generated result', caseCompareLabel: 'Compare original and result', caseLocalization: 'Localization', caseGeneration: 'Generation',
    finalEyebrow: 'Your turn to create', finalTitle: 'Let’s finish your\nnext emoticon.', finalDescription: 'Create, refine, and prepare your next release with Glocalizer.', finalCta: 'Open your studio',
  },
  ja: {
    heroTitle: 'アイデアから\n世界へ届くスタンプまで、\nGlocalizerと一緒に。',
    heroDescription: 'スタンプを作り、他の言語に合わせて整え、リリースの準備まで。制作に必要な流れをひとつに。',
    heroCta: 'Glocalizerを始める', scrollLabel: '見る',
    translationAlt: '韓国語、英語、日本語で挨拶するキャラクター', languageLabels: ['韓国語', '英語', '日本語'],
    workflowEyebrow: 'CREATE · LOCALIZE · REVIEW', workflowTitle: 'アイデアからリリース準備まで', workflowDescription: '制作の各ステップをひとつの場所で進められます。',
    scenes: [
      { kicker: '01 · CREATE', title: 'アイデアを\nスタンプに', description: 'キャラクターや表情のアイデアから、新しいスタンプを作ります。', linkLabel: '制作を始める' },
      { kicker: '02 · LOCALIZE', title: '作品の気持ちを\n他の言語へ', description: '元の雰囲気を活かし、英語・日本語・中国語の表現に整えます。', linkLabel: '現地化を始める' },
      { kicker: '03 · REVIEW', title: 'リリース前に\nしっかり確認', description: 'OGQの基準に合わせて画像や文言を確認し、リリースに備えます。', linkLabel: '確認を始める' },
    ],
    caseEyebrow: 'REAL WORK · 実際の制作例', caseTitle: '実際の制作結果を比べてみましょう', caseDescription: '許可を得たGlocalizerの制作例を比較してみましょう。', caseOriginal: 'オリジナル', caseLocalizationResult: '現地化結果', caseGenerationResult: '生成結果', caseCompareLabel: 'オリジナルと制作結果を比較', caseLocalization: '現地化', caseGeneration: '生成',
    finalEyebrow: '次はあなたの番です', finalTitle: '次のスタンプを\n一緒に完成させましょう。', finalDescription: 'Glocalizerでアイデアを形にして、リリースの準備をしましょう。', finalCta: 'スタジオを開く',
  },
  zh: {
    heroTitle: '从创作灵感\n到走向世界的表情，\n与 Glocalizer 一起。',
    heroDescription: '创作新表情、适配不同语言，并为发布做好准备。在一个工作流程中完成创作所需的一切。',
    heroCta: '开始使用 Glocalizer', scrollLabel: '浏览',
    translationAlt: '用韩语、英语和日语打招呼的角色', languageLabels: ['韩语', '英语', '日语'],
    workflowEyebrow: 'CREATE · LOCALIZE · REVIEW', workflowTitle: '从灵感到发布准备', workflowDescription: '在一个工作空间中完成创作的每个阶段。',
    scenes: [
      { kicker: '01 · CREATE', title: '把灵感变成\n表情作品', description: '根据角色和表情灵感创作新的表情。', linkLabel: '开始创作' },
      { kicker: '02 · LOCALIZE', title: '让作品情感\n传递到其他语言', description: '保留原作氛围，将文案调整为自然的英语、日语和中文表达。', linkLabel: '开始本地化' },
      { kicker: '03 · REVIEW', title: '为正式发布\n做好准备', description: '根据 OGQ 要求检查图片与文案，安心准备发布。', linkLabel: '开始检查' },
    ],
    caseEyebrow: 'REAL WORK · 实际案例', caseTitle: '看看真实作品的创作成果', caseDescription: '拖动对比已获授权的 Glocalizer 实际作品。', caseOriginal: '原作', caseLocalizationResult: '本地化结果', caseGenerationResult: '生成结果', caseCompareLabel: '对比原作与创作结果', caseLocalization: '本地化', caseGeneration: '生成',
    finalEyebrow: '现在轮到你了', finalTitle: '一起完成你的\n下一张表情吧。', finalDescription: '用 Glocalizer 创作、润色并准备发布你的下一组表情。', finalCta: '打开工作室',
  },
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
  const { isAuthenticated } = useAuth()
  const { lang, t } = useSiteLang()
  const copy = COPY[lang]
  const pageRef = useRef<HTMLDivElement>(null)
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
    const root = pageRef.current
    const header = root?.querySelector('header')
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
      const headerHeight = pageRef.current?.querySelector('header')?.getBoundingClientRect().height ?? 72
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
        <p>{copy.scenes[index].kicker}</p>
        <h2>{copy.scenes[index].title.split('\n').map(line => <span key={line}>{line}</span>)}</h2>
        <div>{copy.scenes[index].description}</div>
        <div className="remake-scene-progress" aria-hidden>
          {copy.scenes.map((item, step) => <span key={item.kicker} data-active={step <= index} />)}
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
    <div ref={pageRef} className="remake-page main-restyle" data-lang={lang} style={{ '--ogq-gallery': `url(${ogqGalleryReference})` } as CSSProperties}>
      <Header center={<nav className="remake-header-nav" aria-label={t.navStart}>
        <button type="button" onClick={() => navigate('/dashboard')}>{t.navStart}</button>
        <button type="button" onClick={() => navigate('/service')}>{t.navService}</button>
      </nav>} right={<div className="remake-header-actions">
        <LanguageSelect />
        {isAuthenticated ? <AccountMenu /> : (
          <button type="button" onClick={() => navigate('/login')} className="bg-surface">{t.navLogin}</button>
        )}
      </div>} />
      <main>
        <section className="remake-hero" data-lang={lang}>
          <div className="remake-hero-inner">
            <h1 key={`title-${lang}`}>{copy.heroTitle.split('\n').map((line, index) => (
              <span key={line} style={{ animationDelay: `${index * 0.12}s` }}>{line}</span>
            ))}</h1>
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
          <div className="remake-workflow-heading"><p className="remake-eyebrow">{copy.workflowEyebrow}</p><h2>{copy.workflowTitle}</h2><p>{copy.workflowDescription}</p></div>
          <div ref={workflowGridRef} className="remake-workflow-grid" data-motion-ready="true">
            {copy.scenes.map((item, index) => (
              <article
                key={item.kicker}
                data-visible={workflowVisible[index]}
                data-active={activeWorkflowIndex === index}
                style={{ '--workflow-delay': `${index * 120}ms` } as CSSProperties}
                onPointerDown={() => setActiveWorkflowIndex(index)}
              >
                <img src={WORKFLOW_VISUALS[index]} alt="" width={201} height={201} loading="lazy" decoding="async" className="remake-workflow-visual" />
                <p>{item.kicker}</p>
                <h3>{item.title.split('\n').map((line) => <span key={line}>{line}</span>)}</h3>
                <div>{item.description}</div>
                <Link to={['/generate', '/localize', '/review'][index]} className="remake-workflow-link" onFocus={() => setActiveWorkflowIndex(index)}>{item.linkLabel}<ArrowRight size={17} /></Link>
              </article>
            ))}
          </div>
        </section>

        {showcases.length > 0 && <section className="remake-cases">
          <div className="remake-cases-heading"><p className="remake-eyebrow">{copy.caseEyebrow}</p><h2>{copy.caseTitle}</h2><p>{copy.caseDescription}</p></div>
          <div className="remake-case-grid">{showcases.map((item) => <ShowcaseCompare key={item.id} item={item} copy={copy} />)}</div>
        </section>}

        <div className="remake-ogq-proof"><OgqStickerGallery fallbackImage={ogqGalleryReference} /></div>

        <section className="remake-final">
          <p className="remake-eyebrow">{copy.finalEyebrow}</p>
          <h2>{copy.finalTitle.split('\n').map((line) => <span key={line}>{line}</span>)}</h2>
          <p>{copy.finalDescription}</p>
          <Button size="lg" onClick={() => navigate('/dashboard')}>{copy.finalCta}<ArrowRight size={18} /></Button>
        </section>
      </main>
      <Footer />
    </div>
  )
}
