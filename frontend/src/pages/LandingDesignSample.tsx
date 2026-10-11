import { ArrowRight, ArrowUp, ArrowUpRight } from 'lucide-react'
import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import LandingRemake from './LandingRemake'
import { useSiteLang } from '../i18n/LanguageContext'
import type { SiteLang } from '../i18n/translations'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import heroCharacter from '../assets/studio/hero-character.webp'
import '../landing-samples.css'

type SampleNumber = 1 | 2 | 3
type SampleCopy = {
  comparison: string
  names: [string, string, string]
  titles: [string, string]
  description: string
  cta: string
  original: string
  top: string
}

const COPY: Record<SiteLang, SampleCopy> = {
  ko: {
    comparison: '메인 하단 디자인 비교',
    names: ['기기', '캐릭터', '문구'],
    titles: ['아이디어를,\n이모티콘으로.', '다음 이모티콘,\n지금 만들어 보세요.'],
    description: '캐릭터 생성부터 다국어 현지화,\n출시 전 검토까지 한곳에서 진행하세요.',
    cta: '워크스페이스 열기', original: '현재 메인', top: '상단 보기',
  },
  en: {
    comparison: 'Compare homepage endings',
    names: ['Device', 'Art', 'Type'],
    titles: ['Turn an idea\ninto a sticker.', 'Your next sticker.\nStart here.'],
    description: 'Create your character, localize captions,\nand review before release in one workspace.',
    cta: 'Open workspace', original: 'Original', top: 'Back to top',
  },
  ja: {
    comparison: 'ホーム下部のデザイン比較',
    names: ['機器', 'キャラ', '文字'],
    titles: ['アイデアを、\nスタンプに。', '次のスタンプを、\nここから。'],
    description: 'キャラクター生成から多言語対応、\nリリース前の確認まで、一つのワークスペースで。',
    cta: 'ワークスペースを開く', original: '元の画面', top: '上部へ',
  },
  zh: {
    comparison: '比较首页底部设计',
    names: ['设备', '角色', '文字'],
    titles: ['将创意，\n变成表情。', '下一张表情，\n从这里开始。'],
    description: '从角色生成、多语言本地化，\n到发布前检查，在同一个工作区完成。',
    cta: '打开工作区', original: '当前首页', top: '返回顶部',
  },
}

function SampleEnding({ variant, copy }: { variant: 2 | 3; copy: SampleCopy }) {
  return (
    <section id="main-ending" aria-labelledby="sample-ending-title" className={`sample-ending sample-ending-${variant}`}>
      <div className="sample-ending-inner">
        <div className="sample-ending-copy">
          <h2 id="sample-ending-title">{copy.titles[variant - 2].split('\n').map(line => <span key={line}>{line}</span>)}</h2>
          <p>{copy.description.split('\n').map(line => <span key={line}>{line}</span>)}</p>
          <Link to="/dashboard" className="sample-cta">
            {copy.cta}{variant === 3 ? <ArrowUpRight aria-hidden size={26} /> : <ArrowRight aria-hidden size={20} />}
          </Link>
        </div>
        {variant === 2 && <img src={heroCharacter} alt="" aria-hidden width={1391} height={1131} className="sample-character" />}
      </div>
    </section>
  )
}

function revealEnding() {
  return requestAnimationFrame(() => document.getElementById('main-ending')?.scrollIntoView({ block: 'start', behavior: 'instant' }))
}

export default function LandingDesignSample() {
  const { pathname } = useLocation()
  const { lang } = useSiteLang()
  const copy = COPY[lang]
  const variant: SampleNumber = pathname === '/sub2' ? 2 : pathname === '/sub3' ? 3 : 1
  useDocumentMeta(`${copy.comparison} ${variant}`, copy.description.replace('\n', ' '))

  useEffect(() => {
    // Open on the area being compared; the toolbar lets the visitor inspect the full homepage.
    const frame = revealEnding()
    return () => cancelAnimationFrame(frame)
  }, [variant])

  return (
    <div className="landing-design-sample" data-design={variant}>
      <LandingRemake ending={variant === 1 ? undefined : <SampleEnding variant={variant} copy={copy} />} />
      <nav className="sample-switcher" aria-label={copy.comparison}>
        <span className="sample-switcher-label">{copy.comparison}</span>
        {[1, 2, 3].map(number => (
          <Link key={number} to={`/sub${number}#main-ending`} onClick={() => { revealEnding() }} aria-current={variant === number ? 'page' : undefined}>
            <span>{number}</span>{copy.names[number - 1]}
          </Link>
        ))}
        <Link to="/#main-ending" className="sample-original" onClick={() => { revealEnding() }}>{copy.original}</Link>
        <button type="button" aria-label={copy.top} title={copy.top} onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })}>
          <ArrowUp size={18} aria-hidden />
        </button>
      </nav>
    </div>
  )
}
