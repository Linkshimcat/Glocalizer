import { ArrowDown, ArrowRight, Globe2, ShieldCheck, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import motionGraphic from '../assets/LendingPage/MotionGrap.mp4'
import refreshIcon from '../assets/LendingPage/refreshButton.svg'
import macbookFrame from '../assets/LandingRemake/macbook_mockup_transparent.png'
import iphoneFrame from '../assets/LandingRemake/iphone_17_pro_transparent.png'
import ogqGalleryReference from '../assets/LandingRemake/ogq-gallery-reference.jpg'
import generatePhoneCapture from '../assets/LandingRemake/phone-captures/generate-project-ko.png'
import localizePhoneCapture from '../assets/LandingRemake/phone-captures/localize-upload-ko.png'
import reviewPhoneCapture from '../assets/LandingRemake/phone-captures/review-projects-ko.png'
import generateDesktopCapture from '../assets/LandingRemake/desktop-captures/generate-project-ko.png'
import localizeDesktopCapture from '../assets/LandingRemake/desktop-captures/localize-upload-ko.png'
import reviewDesktopCapture from '../assets/LandingRemake/desktop-captures/review-projects-ko.png'
import workflowCreateVisual from '../assets/LandingRemake/Gen.png'
import workflowLocalizeVisual from '../assets/LandingRemake/Local.png'
import workflowReviewVisual from '../assets/LandingRemake/check.png'
import Button from '../components/Button'
import AccountMenu from '../components/AccountMenu'
import Footer from '../components/Footer'
import Header from '../components/Header'
import LanguageSelect from '../components/LanguageSelect'
import OgqStickerGallery from '../components/OgqStickerGallery'
import RollingText from '../components/RollingText'
import { useSiteLang } from '../i18n/LanguageContext'
import { getLandingShowcases, type LandingShowcase } from '../lib/api'
import { useAuth } from '../store/AuthContext'
import type { SiteLang } from '../i18n/translations'

type SceneCopy = {
  kicker: string
  title: string
  description: string
}

type RemakeCopy = {
  heroTitle: string
  heroDescription: string
  heroCta: string
  scrollLabel: string
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
    heroTitle: '아이디어에서 출시까지,\n이모티콘 창작의 모든 과정.',
    heroDescription: '새로운 이모티콘을 만들고, 여러 언어로 다듬고, 출시 전까지 확인해요. 창작에 필요한 흐름을 한곳에서 이어 보세요.',
    heroCta: 'Glocalizer 시작하기', scrollLabel: '둘러보기',
    workflowEyebrow: 'CREATE · LOCALIZE · REVIEW', workflowTitle: '아이디어부터 출시 준비까지', workflowDescription: '창작의 각 단계를 한곳에서 이어 가세요.',
    scenes: [
      { kicker: '01 · CREATE', title: '아이디어를\n이모티콘으로', description: '만들고 싶은 캐릭터와 표정을 바탕으로 새 이모티콘을 생성해요.' },
      { kicker: '02 · LOCALIZE', title: '작품의 감정을\n다른 언어로', description: '원본의 분위기를 살려 영어·일본어·중국어 문구를 만들고 직접 다듬어요.' },
      { kicker: '03 · REVIEW', title: '출시 준비를\n꼼꼼하게 확인', description: 'OGQ 기준에 맞춰 이미지와 문구를 검토하고 출시를 준비해요.' },
    ],
    caseEyebrow: 'REAL WORK · 실제 작업 사례', caseTitle: '실제 작업 결과를 비교해 보세요', caseDescription: '사용 허락을 받은 Glocalizer 작업물을 직접 비교해 보세요.', caseOriginal: '원본', caseLocalizationResult: '현지화 결과', caseGenerationResult: '생성 결과', caseCompareLabel: '원본과 작업 결과 비교', caseLocalization: '현지화', caseGeneration: '생성',
    finalEyebrow: '이제 당신의 차례예요', finalTitle: '다음 이모티콘을\n함께 완성해요.', finalDescription: 'Glocalizer에서 아이디어를 만들고, 다듬고, 출시를 준비해 보세요.', finalCta: '작업실 열기',
  },
  en: {
    heroTitle: 'From first idea to release,\nevery step of creating.',
    heroDescription: 'Create new emoticons, refine them for other languages, and get ready to release—all in one creative workflow.',
    heroCta: 'Start Glocalizer', scrollLabel: 'Explore',
    workflowEyebrow: 'CREATE · LOCALIZE · REVIEW', workflowTitle: 'From idea to release-ready', workflowDescription: 'Move through every stage of creating in one place.',
    scenes: [
      { kicker: '01 · CREATE', title: 'Turn an idea into\nan emoticon', description: 'Create new emoticons from your character and expression ideas.' },
      { kicker: '02 · LOCALIZE', title: 'Carry the feeling\ninto new languages', description: 'Keep the original tone while adapting captions into English, Japanese, and Chinese.' },
      { kicker: '03 · REVIEW', title: 'Get ready\nfor release', description: 'Review your images and captions against OGQ requirements before release.' },
    ],
    caseEyebrow: 'REAL WORK · CREATOR CASES', caseTitle: 'See real work come together', caseDescription: 'Compare real Glocalizer work shared with permission.', caseOriginal: 'Original', caseLocalizationResult: 'Localized result', caseGenerationResult: 'Generated result', caseCompareLabel: 'Compare original and result', caseLocalization: 'Localization', caseGeneration: 'Generation',
    finalEyebrow: 'Your turn to create', finalTitle: 'Let’s finish your\nnext emoticon.', finalDescription: 'Create, refine, and prepare your next release with Glocalizer.', finalCta: 'Open your studio',
  },
  ja: {
    heroTitle: 'アイデアからリリースまで、\nスタンプ制作のすべてを。',
    heroDescription: 'スタンプを作り、他の言語に合わせて整え、リリースの準備まで。制作に必要な流れをひとつに。',
    heroCta: 'Glocalizerを始める', scrollLabel: '見る',
    workflowEyebrow: 'CREATE · LOCALIZE · REVIEW', workflowTitle: 'アイデアからリリース準備まで', workflowDescription: '制作の各ステップをひとつの場所で進められます。',
    scenes: [
      { kicker: '01 · CREATE', title: 'アイデアを\nスタンプに', description: 'キャラクターや表情のアイデアから、新しいスタンプを作ります。' },
      { kicker: '02 · LOCALIZE', title: '作品の気持ちを\n他の言語へ', description: '元の雰囲気を活かし、英語・日本語・中国語の表現に整えます。' },
      { kicker: '03 · REVIEW', title: 'リリース前に\nしっかり確認', description: 'OGQの基準に合わせて画像や文言を確認し、リリースに備えます。' },
    ],
    caseEyebrow: 'REAL WORK · 実際の制作例', caseTitle: '実際の制作結果を比べてみましょう', caseDescription: '許可を得たGlocalizerの制作例を比較してみましょう。', caseOriginal: 'オリジナル', caseLocalizationResult: '現地化結果', caseGenerationResult: '生成結果', caseCompareLabel: 'オリジナルと制作結果を比較', caseLocalization: '現地化', caseGeneration: '生成',
    finalEyebrow: '次はあなたの番です', finalTitle: '次のスタンプを\n一緒に完成させましょう。', finalDescription: 'Glocalizerでアイデアを形にして、リリースの準備をしましょう。', finalCta: 'スタジオを開く',
  },
  zh: {
    heroTitle: '从灵感到发布，\n完成表情创作的每一步。',
    heroDescription: '创作新表情、适配不同语言，并为发布做好准备。在一个工作流程中完成创作所需的一切。',
    heroCta: '开始使用 Glocalizer', scrollLabel: '浏览',
    workflowEyebrow: 'CREATE · LOCALIZE · REVIEW', workflowTitle: '从灵感到发布准备', workflowDescription: '在一个工作空间中完成创作的每个阶段。',
    scenes: [
      { kicker: '01 · CREATE', title: '把灵感变成\n表情作品', description: '根据角色和表情灵感创作新的表情。' },
      { kicker: '02 · LOCALIZE', title: '让作品情感\n传递到其他语言', description: '保留原作氛围，将文案调整为自然的英语、日语和中文表达。' },
      { kicker: '03 · REVIEW', title: '为正式发布\n做好准备', description: '根据 OGQ 要求检查图片与文案，安心准备发布。' },
    ],
    caseEyebrow: 'REAL WORK · 实际案例', caseTitle: '看看真实作品的创作成果', caseDescription: '拖动对比已获授权的 Glocalizer 实际作品。', caseOriginal: '原作', caseLocalizationResult: '本地化结果', caseGenerationResult: '生成结果', caseCompareLabel: '对比原作与创作结果', caseLocalization: '本地化', caseGeneration: '生成',
    finalEyebrow: '现在轮到你了', finalTitle: '一起完成你的\n下一张表情吧。', finalDescription: '用 Glocalizer 创作、润色并准备发布你的下一组表情。', finalCta: '打开工作室',
  },
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
      <iframe
        key={`${lang}-${width}-${screenRoute}`}
        src={screenRoute}
        title={title}
        className="remake-product-screen remake-product-live"
        style={{ width, height, transform: `scale(${scale})` }}
        loading="eager"
        tabIndex={-1}
      />
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
  const storyRef = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [reduceMotion, setReduceMotion] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [heroReplayCount, setHeroReplayCount] = useState(0)
  const [scene, setScene] = useState(1)
  const tickingRef = useRef(false)
  const [showcases, setShowcases] = useState<LandingShowcase[]>([])

  useEffect(() => {
    let active = true
    void getLandingShowcases().then((items) => { if (active) setShowcases(items) }).catch(() => { if (active) setShowcases([]) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduceMotion(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (reduceMotion) videoRef.current?.pause()
  }, [reduceMotion])

  useEffect(() => {
    const syncScenes = () => {
      tickingRef.current = false
      const story = storyRef.current
      if (!story) return
      const rect = story.getBoundingClientRect()
      const travel = Math.max(story.offsetHeight - window.innerHeight, 1)
      const progress = Math.min(Math.max(-rect.top / travel, 0), 1)
      const nextScene = Math.min(Math.floor(progress * 3), 2)
      setScene((current) => current === nextScene ? current : nextScene)
    }
    const onScroll = () => {
      if (tickingRef.current) return
      tickingRef.current = true
      requestAnimationFrame(syncScenes)
    }
    syncScenes()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  const jumpToStory = () => {
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    storyRef.current?.scrollIntoView({ behavior })
  }

  const replayHero = () => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = 0
    void video.play()
    setHeroReplayCount(count => count + 1)
  }

  return (
    <div className="remake-page" style={{ '--ogq-gallery': `url(${ogqGalleryReference})` } as CSSProperties}>
      <Header center={<nav className="remake-header-nav" aria-label={t.navStart}>
        <button type="button" onClick={() => navigate('/dashboard')}>{t.navStart}</button>
        <button type="button" onClick={() => navigate('/service')}>{t.navService}</button>
        <LanguageSelect />
        {isAuthenticated ? <AccountMenu /> : (
          <button type="button" onClick={() => navigate('/login')} className="bg-surface">{t.navLogin}</button>
        )}
      </nav>} />
      <main>
        <div className="remake-hero-shell" data-reduced-motion={reduceMotion}>
          <video ref={videoRef} className="remake-hero-video" src={motionGraphic} autoPlay={!reduceMotion} muted playsInline preload="metadata" aria-hidden />
          <section className="remake-hero">
            <div className="remake-hero-inner">
              <h1 key={`title-${lang}-${heroReplayCount}`}>{copy.heroTitle.split('\n').map((line, index) => (
                <span key={line}>
                  <span className="sr-only">{line}</span>
                  <RollingText items={[line]} loop={false} delaySeconds={index * 0.12} />
                </span>
              ))}</h1>
              <p key={`description-${lang}-${heroReplayCount}`} className="remake-hero-description">{copy.heroDescription}</p>
              <div className="remake-hero-actions">
                <Button size="lg" onClick={() => navigate('/dashboard')}>{copy.heroCta}<ArrowRight size={18} /></Button>
                <button type="button" onClick={jumpToStory} className="remake-scroll-button">{copy.scrollLabel}<ArrowDown size={17} /></button>
              </div>
              <div className="remake-hero-pillars" aria-hidden>
                <span><Sparkles size={15} />CREATE</span><i /><span><Globe2 size={15} />LOCALIZE</span><i /><span><ShieldCheck size={15} />REVIEW</span>
              </div>
            </div>
            <button type="button" onClick={replayHero} className="remake-hero-replay" aria-label={t.heroReplay} title={t.heroReplay}>
              <img src={refreshIcon} alt="" aria-hidden />
            </button>
          </section>
        </div>

        <section ref={storyRef} className="remake-story" data-lang={lang}>
          <div className="remake-story-sticky">
            <div className="remake-scene-copy" key={`${lang}-${scene}`}>
              <p>{copy.scenes[scene].kicker}</p>
              <h2>{copy.scenes[scene].title.split('\n').map((line) => <span key={line}>{line}</span>)}</h2>
              <div>{copy.scenes[scene].description}</div>
            </div>
            <div className="remake-device-wrap">
              <div className="remake-device">
                <LiveProductScreen
                  lang={lang}
                  title={copy.scenes[scene].title.replace('\n', ' ')}
                  scene={scene}
                  phoneCapture={lang === 'ko' ? [generatePhoneCapture, localizePhoneCapture, reviewPhoneCapture][scene] : undefined}
                  desktopCapture={lang === 'ko' ? [generateDesktopCapture, localizeDesktopCapture, reviewDesktopCapture][scene] : undefined}
                />
                <img src={macbookFrame} alt="Glocalizer 작업 화면을 보여주는 MacBook" className="remake-device-frame remake-device-frame-desktop" />
                <img src={iphoneFrame} alt="Glocalizer 작업 화면을 보여주는 iPhone" className="remake-device-frame remake-device-frame-mobile" />
              </div>
            </div>
          </div>
        </section>

        <section className="remake-workflow">
          <div className="remake-workflow-heading"><p className="remake-eyebrow">{copy.workflowEyebrow}</p><h2>{copy.workflowTitle}</h2><p>{copy.workflowDescription}</p></div>
          <div className="remake-workflow-grid">{copy.scenes.map((item, index) => <article key={item.kicker}><p>{item.kicker}</p><h3>{item.title.split('\n').map((line) => <span key={line}>{line}</span>)}</h3><div>{item.description}</div><img src={WORKFLOW_VISUALS[index]} alt="" width={201} height={201} loading="lazy" decoding="async" className="remake-workflow-visual" /></article>)}</div>
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
