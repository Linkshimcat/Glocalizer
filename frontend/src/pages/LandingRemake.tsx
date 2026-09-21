import { ArrowDown, ArrowRight, Check, Download, Eye, FileArchive, ImagePlus, Undo2 } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import macbookFrame from '../assets/LandingRemake/macbook_mockup_transparent.png'
import iphoneFrame from '../assets/LandingRemake/iphone_17_pro_transparent.png'
import ambientGradient from '../assets/LandingRemake/ambient-gradient.jpg'
import ogqGalleryReference from '../assets/LandingRemake/ogq-gallery-reference.jpg'
import motionGraphic from '../assets/LendingPage/MotionGrap.mp4'
import dragNDropImage from '../assets/GCFrontendUI/DragNDropIMG.svg'
import usFlag from '../assets/GCFrontendUI/USA (us).svg'
import jpFlag from '../assets/GCFrontendUI/Japan (JP).svg'
import cnFlag from '../assets/GCFrontendUI/China (CN).svg'
import Button from '../components/Button'
import Footer from '../components/Footer'
import Header from '../components/Header'
import NavMenu from '../components/NavMenu'
import OgqStickerGallery from '../components/OgqStickerGallery'
import RollingText from '../components/RollingText'
import { useSiteLang } from '../i18n/LanguageContext'
import type { SiteLang } from '../i18n/translations'

type SceneCopy = {
  kicker: string
  title: string
  description: string
}

type RemakeCopy = {
  eyebrow: string
  heroLines: [string, string, string]
  heroRotations: [string, string, string, string]
  heroDescription: string
  heroCta: string
  scrollLabel: string
  showcaseLabel: string
  storyEyebrow: string
  storyTitle: string
  storyDescription: string
  scenes: [SceneCopy, SceneCopy, SceneCopy, SceneCopy]
  finalEyebrow: string
  finalTitle: string
  finalDescription: string
  finalCta: string
}

const COPY: Record<SiteLang, RemakeCopy> = {
  ko: {
    eyebrow: '한글 이모티콘 현지화',
    heroLines: ['한글의 감정은', '번역되어도', '그대로여야 하니까.'],
    heroRotations: ['그대로여야 하니까.', '말투까지 살아야 하니까.', '뉘앙스까지 남아야 하니까.', '세계에서도 통해야 하니까.'],
    heroDescription: '말투와 뉘앙스까지 이해하는 이모티콘 현지화. 한 장의 감정을 전 세계의 언어로 이어 보세요.',
    heroCta: '현지화 시작하기',
    scrollLabel: '과정 살펴보기',
    showcaseLabel: '실제 Glocalizer 작업 화면',
    storyEyebrow: 'Glocalizer가 일하는 방식',
    storyTitle: '한 장이 세계로 가는 과정',
    storyDescription: '스크롤을 내려 Glocalizer의 실제 작업 흐름을 확인해 보세요.',
    scenes: [
      { kicker: '01 · UPLOAD', title: '한글 이모티콘을\n그대로 올리고', description: 'PNG 이미지를 올리면 글자와 표정을 함께 읽어 현지화 준비를 시작해요.' },
      { kicker: '02 · LOCALIZE', title: '말투의 온도까지\n세계의 언어로', description: '직역하지 않고 상황과 감정을 살려 영어·일본어·중국어 표현을 제안해요.' },
      { kicker: '03 · REFINE', title: '눈으로 확인하고\n내 손으로 다듬고', description: '실제 이미지 위에서 문구를 비교하고 OGQ 출시 조건까지 한 번에 확인해요.' },
      { kicker: '04 · RELEASE', title: '완성된 감정을\n바로 세상으로', description: '언어별 결과물을 한 번에 내려받고 다음 시장을 향해 출발하세요.' },
    ],
    finalEyebrow: '이제 세계로 나갈 시간',
    finalTitle: '당신의 감정에도\n국경이 없도록.',
    finalDescription: '첫 번째 이모티콘을 올리는 순간, 세계를 향한 현지화가 시작됩니다.',
    finalCta: 'Glocalizer 시작하기',
  },
  en: {
    eyebrow: 'Emoticon localization',
    heroLines: ['Keep the feeling', 'even when words', 'cross borders.'],
    heroRotations: ['cross borders.', 'keep their true tone.', 'hold every nuance.', 'feel natural everywhere.'],
    heroDescription: 'Localize emoticons with their tone and nuance intact. Carry one feeling into every language.',
    heroCta: 'Start localizing', scrollLabel: 'See how it works', showcaseLabel: 'Glocalizer in action', storyEyebrow: 'How Glocalizer works', storyTitle: 'One image, ready for the world', storyDescription: 'Scroll through the real Glocalizer workflow.',
    scenes: [
      { kicker: '01 · UPLOAD', title: 'Upload the Korean\nemoticon as it is', description: 'We read the words and expression together to prepare the image for localization.' },
      { kicker: '02 · LOCALIZE', title: 'Carry its tone into\nevery language', description: 'Get natural English, Japanese, and Chinese suggestions—not literal translations.' },
      { kicker: '03 · REFINE', title: 'Preview, compare,\nand make it yours', description: 'Polish every phrase on the image and check OGQ release requirements in one place.' },
      { kicker: '04 · RELEASE', title: 'Send the finished\nfeeling worldwide', description: 'Download every language at once and get ready for the next market.' },
    ],
    finalEyebrow: 'Ready for the world', finalTitle: 'Let your feelings\ncross every border.', finalDescription: 'Your global journey begins with the first emoticon you upload.', finalCta: 'Start Glocalizer',
  },
  ja: {
    eyebrow: '韓国語スタンプのローカライズ', heroLines: ['韓国語の感情を', '翻訳しても', 'そのまま届ける。'], heroRotations: ['そのまま届ける。', '話し方まで伝える。', 'ニュアンスを残す。', '世界でも通じる。'], heroDescription: '話し方とニュアンスまで理解するスタンプのローカライズ。一つの感情を世界の言語へ。', heroCta: 'ローカライズを始める', scrollLabel: 'プロセスを見る', showcaseLabel: 'Glocalizerの実際の画面', storyEyebrow: 'Glocalizerの仕組み', storyTitle: '一枚が世界へ届くまで', storyDescription: 'スクロールしてGlocalizerの実際の流れをご覧ください。',
    scenes: [
      { kicker: '01 · UPLOAD', title: '韓国語のスタンプを\nそのままアップロード', description: '文字と表情を一緒に読み取り、ローカライズの準備を始めます。' },
      { kicker: '02 · LOCALIZE', title: '話し方の温度まで\n世界の言語へ', description: '直訳ではなく、状況と感情を活かした自然な表現を提案します。' },
      { kicker: '03 · REFINE', title: '目で確認して\n自分の手で仕上げる', description: '画像上で文言を比較し、OGQのリリース条件もまとめて確認できます。' },
      { kicker: '04 · RELEASE', title: '完成した感情を\nすぐに世界へ', description: '言語別の結果をまとめてダウンロードし、次の市場へ進みましょう。' },
    ],
    finalEyebrow: '世界へ届ける準備', finalTitle: 'あなたの感情に\n国境がないように。', finalDescription: '最初のスタンプをアップロードした瞬間、世界への一歩が始まります。', finalCta: 'Glocalizerを始める',
  },
  zh: {
    eyebrow: '韩语表情包本地化', heroLines: ['让韩语的情感', '跨越翻译', '依然原汁原味。'], heroRotations: ['依然原汁原味。', '连语气也能保留。', '不丢失细微情绪。', '在世界各地都自然。'], heroDescription: '理解语气与细微情绪的表情包本地化，让一种情感连接全世界的语言。', heroCta: '开始本地化', scrollLabel: '查看流程', showcaseLabel: 'Glocalizer 实际界面', storyEyebrow: 'Glocalizer 的工作方式', storyTitle: '一张图片走向世界的过程', storyDescription: '向下滚动，体验 Glocalizer 的真实工作流程。',
    scenes: [
      { kicker: '01 · UPLOAD', title: '上传原始的\n韩语表情包', description: '同时识别文字与表情，为本地化做好准备。' },
      { kicker: '02 · LOCALIZE', title: '连同语气温度\n一起带向世界', description: '不是生硬直译，而是提供符合情境与情感的自然表达。' },
      { kicker: '03 · REFINE', title: '亲眼确认并\n亲手细致调整', description: '在图片上比较文案，并一次检查 OGQ 上架条件。' },
      { kicker: '04 · RELEASE', title: '让完成的情感\n即刻走向世界', description: '一次下载所有语言版本，向下一个市场出发。' },
    ],
    finalEyebrow: '准备走向世界', finalTitle: '让你的情感\n不再有国界。', finalDescription: '上传第一张表情包的瞬间，全球本地化之旅就此开始。', finalCta: '开始使用 Glocalizer',
  },
}

const LANGS = [
  { flag: usFlag, label: 'English', phrase: 'I missed you!' },
  { flag: jpFlag, label: '日本語', phrase: '会いたかった！' },
  { flag: cnFlag, label: '中文 (简体)', phrase: '好想你！' },
]

function HeroRollingLine({ items }: { items: [string, string, string, string] }) {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    setActiveIndex(0)
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % items.length)
    }, 2800)
    return () => window.clearInterval(timer)
  }, [items])

  return (
    <span className="remake-hero-cycle" aria-live="polite">
      <span key={items[activeIndex]}>
        {[...items[activeIndex]].map((char, index) => (
          <span
            key={`${char}-${index}`}
            className="remake-hero-cycle-char"
            style={{ '--char-delay': `${index * 0.045}s` } as CSSProperties}
          >
            {char}
          </span>
        ))}
      </span>
    </span>
  )
}

function ProductScreen({ scene }: { scene: number }) {
  return (
    <div className="remake-product-screen">
      <div className="remake-appbar">
        <span className="remake-appmark">G</span>
        <strong>Glocalizer</strong>
        {scene >= 2 ? <span className="remake-appfile">ogg-5a231684c355c.png</span> : null}
        <span className="remake-appstep"><b>{scene < 2 ? '1 업로드' : scene === 2 ? '2 편집' : '3 다운로드'}</b><i>›</i><span>{scene < 2 ? '2 편집' : scene === 2 ? '3 다운로드' : '완료'}</span></span>
      </div>

      <div className="remake-screen-content" key={scene}>
        {scene === 0 && (
          <div className="remake-upload-view">
            <div className="remake-screen-heading"><span>1단계 · 업로드</span><h3>이모티콘을 올려주세요</h3><p>PNG, JPG 파일을 끌어다 놓으면 바로 시작할 수 있어요.</p></div>
            <div className="remake-badge-row"><span>AI 현지화에 최적화</span><span>OGQ 업로드 규격</span></div>
            <div className="remake-dropzone">
              <div className="remake-upload-icon"><img src={dragNDropImage} alt="" /></div>
              <strong>파일을 여기에 끌어다 놓으세요</strong>
              <span>PNG · JPG · 여러 장을 한 번에 올릴 수 있어요</span>
              <div><button type="button">파일 선택</button><button type="button" className="remake-outline-button">OGQ 샘플 체험</button></div>
            </div>
          </div>
        )}

        {scene === 1 && (
          <div className="remake-localize-view">
            <div className="remake-screen-heading"><span>1단계 · 업로드</span><h3>번역할 언어를 골라주세요</h3><p>올린 이미지와 언어를 확인한 뒤 번역을 시작하세요.</p></div>
            <div className="remake-uploaded-panel">
              <div className="remake-panel-title"><strong>업로드한 이모티콘</strong><span>1장 선택됨</span></div>
              <div className="remake-file-card"><span><ImagePlus size={18} /></span><div><strong>ogg-5a231684c355c.png</strong><small>PNG · 360 × 360</small></div><Check size={14} /></div>
            </div>
            <div className="remake-language-panel">
              <div className="remake-panel-title"><strong>번역 언어</strong><span>전체 선택</span></div>
              <div className="remake-language-list">
                {LANGS.map((item, index) => <div className="remake-language-card" style={{ '--delay': `${index * 70}ms` } as CSSProperties} key={item.label}><img src={item.flag} alt="" /><strong>{item.label}</strong><span><Check size={10} /></span></div>)}
              </div>
              <button type="button" className="remake-start-button">번역 시작하기 <ArrowRight size={13} /></button>
            </div>
          </div>
        )}

        {scene === 2 && (
          <div className="remake-editor-view">
            <div className="remake-editor-toolbar"><span><Undo2 size={12} /> 실행 취소</span><span><Eye size={12} /> 미리보기</span><button type="button"><Download size={12} /> PNG 저장</button></div>
            <aside className="remake-file-rail"><small>이모티콘 1장 · 완료 0장</small><div><span className="remake-market-sticker remake-market-sticker-small" aria-hidden /><p><strong>ogg-5a...</strong><em>편집 중</em></p><Check size={11} /></div></aside>
            <div className="remake-editor-workspace"><div className="remake-canvas-tabs"><span>원본</span><strong>변환 미리보기</strong></div><div className="remake-editor-canvas"><div className="remake-market-sticker remake-market-sticker-large" aria-label="현지화 중인 실제 OGQ 스타일 이모티콘" /><span className="remake-selection-box" /></div></div>
            <div className="remake-editor-panel">
              <span><img src={usFlag} alt="" /> English 편집 중</span><h3>텍스트 편집</h3>
              <div className="remake-field"><small>현지화 문구</small><strong>I missed you!</strong></div>
              <div className="remake-style-controls"><span>Aa</span><span>32px</span><span>가운데</span></div>
              <button type="button">변경사항 적용</button>
            </div>
          </div>
        )}

        {scene === 3 && (
          <div className="remake-finish-view">
            <div className="remake-result-hero"><span className="remake-success"><Check size={20} /></span><div><strong>현지화가 완료됐어요</strong><small>3개 언어의 결과물을 확인하고 내려받으세요.</small></div></div>
            <div className="remake-result-title"><strong>결과 미리보기</strong><span>OGQ 업로드 규격 확인 완료</span></div>
            <div className="remake-result-grid">{LANGS.map((item, index) => <div key={item.label}><span><img src={item.flag} alt="" />{item.label}</span><div className={`remake-market-sticker remake-market-sticker-${index + 1}`} aria-label={`${item.phrase} 이모티콘 미리보기`} /><Check size={12} /></div>)}</div>
            <button type="button"><FileArchive size={15} /> 전체 결과 ZIP 다운로드</button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function LandingRemake() {
  const navigate = useNavigate()
  const { lang } = useSiteLang()
  const copy = COPY[lang]
  const storyRef = useRef<HTMLElement>(null)
  const tickingRef = useRef(false)
  const [scene, setScene] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const syncStory = () => {
      tickingRef.current = false
      const story = storyRef.current
      if (!story) return
      const rect = story.getBoundingClientRect()
      const travel = Math.max(story.offsetHeight - window.innerHeight, 1)
      const nextProgress = Math.min(Math.max(-rect.top / travel, 0), 1)
      const nextScene = Math.min(Math.floor(nextProgress * 4), 3)
      setProgress((current) => Math.abs(current - nextProgress) > 0.002 ? nextProgress : current)
      setScene((current) => current === nextScene ? current : nextScene)
    }
    const onScroll = () => {
      if (tickingRef.current) return
      tickingRef.current = true
      requestAnimationFrame(syncStory)
    }
    syncStory()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  const jumpToStory = () => storyRef.current?.scrollIntoView({ behavior: 'smooth' })

  return (
    <div className="remake-page" style={{ '--remake-bg': `url(${ambientGradient})`, '--ogq-gallery': `url(${ogqGalleryReference})` } as CSSProperties}>
      <Header center={<NavMenu />} sticky />
      <main>
        <section className="remake-hero">
          <div className="remake-hero-inner">
            <p className="remake-eyebrow">{copy.eyebrow}</p>
            <h1>
              <span className="sr-only">{copy.heroLines.slice(0, 2).join(' ')} {copy.heroRotations.join(', ')}</span>
              {copy.heroLines.slice(0, 2).map((line, index) => (
                <RollingText
                  key={`${lang}-${line}`}
                  items={[line]}
                  loop={false}
                  nowrap
                  delaySeconds={index * 0.16}
                  className={`block whitespace-nowrap ${index === 2 ? 'text-brand' : ''}`}
                />
              ))}
              <HeroRollingLine items={copy.heroRotations} />
            </h1>
            <p className="remake-hero-description">{copy.heroDescription}</p>
            <div className="remake-hero-actions">
              <Button size="lg" onClick={() => navigate('/dashboard')}>{copy.heroCta} <ArrowRight size={18} /></Button>
              <button type="button" onClick={jumpToStory} className="remake-scroll-button">{copy.scrollLabel}<ArrowDown size={17} /></button>
            </div>
          </div>
        </section>

        <section className="remake-showcase" aria-label={copy.showcaseLabel}>
          <div className="remake-showcase-heading">
            <span>{copy.showcaseLabel}</span>
            <span aria-hidden>01 — 04</span>
          </div>
          <div className="remake-showcase-frame">
            <video
              src={motionGraphic}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-label={copy.showcaseLabel}
            />
          </div>
        </section>

        <section className="remake-story-intro">
          <p className="remake-eyebrow">{copy.storyEyebrow}</p>
          <h2>{copy.storyTitle}</h2>
          <p>{copy.storyDescription}</p>
        </section>

        <section ref={storyRef} className="remake-story">
          <div className="remake-story-sticky">
            <div className="remake-scene-copy" key={`${lang}-${scene}`}>
              <p>{copy.scenes[scene].kicker}</p>
              <h2>{copy.scenes[scene].title.split('\n').map((line) => <span key={line}>{line}</span>)}</h2>
              <div>{copy.scenes[scene].description}</div>
              <div className="remake-progress" aria-label={`${scene + 1} / 4`}><span style={{ width: `${Math.max(progress * 100, 3)}%` }} /></div>
            </div>
            <div className="remake-device-wrap" style={{ '--story-progress': progress } as CSSProperties}>
              <div className="remake-device-glow" aria-hidden />
              <div className="remake-device">
                <ProductScreen scene={scene} />
                <img src={macbookFrame} alt="Glocalizer 작업 화면을 보여주는 MacBook 목업" className="remake-device-frame remake-device-frame-desktop" />
                <img src={iphoneFrame} alt="Glocalizer 작업 화면을 보여주는 iPhone 목업" className="remake-device-frame remake-device-frame-mobile" />
              </div>
            </div>
          </div>
        </section>

        <div className="remake-ogq-proof">
          <OgqStickerGallery fallbackImage={ogqGalleryReference} />
        </div>

        <section className="remake-final">
          <p className="remake-eyebrow">{copy.finalEyebrow}</p>
          <h2>{copy.finalTitle.split('\n').map((line) => <span key={line}>{line}</span>)}</h2>
          <p>{copy.finalDescription}</p>
          <Button size="lg" onClick={() => navigate('/dashboard')}>{copy.finalCta} <ArrowRight size={18} /></Button>
        </section>
      </main>
      <Footer />
    </div>
  )
}
