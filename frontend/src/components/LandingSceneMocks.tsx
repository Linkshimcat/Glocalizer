import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import heroCharacter from '../assets/studio/hero-character.webp'
import { captionSuggestCopy } from '../i18n/captionSuggest'
import type { SiteLang } from '../i18n/translations'
import { useSiteLang } from '../i18n/LanguageContext'
import Logo from './Logo'

/**
 * 랜딩 스토리 장면용 정적 목업. 실제 /caption-suggest는 업로드·프로젝트가 없으면 리다이렉트되므로
 * iframe 대신 같은 마크업을 데이터 고정으로 그린다. 부모(LiveProductScreen)가 가상 뷰포트 크기를
 * 주고 scale로 축소한다.
 */

const LANG_LABEL: Record<SiteLang, string> = { ko: '한국어', en: 'English', ja: '日本語', zh: '中文' }

/** 실제 앱 헤더(로고·메뉴·언어·계정)를 정적으로 흉내 낸다. iframe/캡처 장면에는 이 헤더가 이미 들어 있어서 새 목업도 맞춘다. */
function MockFrame({ lang, compact, children }: { lang: SiteLang; compact: boolean; children: ReactNode }) {
  const { t } = useSiteLang()
  const nav = (
    <nav className={`flex items-center gap-6 text-sm font-bold ${compact ? 'justify-center border-b border-line pb-2' : ''}`}>
      <span className="border-b-2 border-brand pb-1 text-action">{t.navStart}</span>
      <span className="pb-1 text-sub">{t.navService}</span>
    </nav>
  )
  return (
    <div className="remake-mock flex h-full w-full flex-col bg-card">
      <header className={`shrink-0 ${compact ? 'px-5 pt-3' : 'flex items-center justify-between border-b border-line px-8 py-3'}`}>
        <div className={compact ? 'flex items-center justify-between pb-2' : 'contents'}>
          <Logo small />
          {!compact && nav}
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-line px-3 py-1 text-xs font-bold">{LANG_LABEL[lang]}</span>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-action text-xs font-bold text-white">W</span>
          </div>
        </div>
        {compact && nav}
      </header>
      <div className={`flex min-h-0 flex-1 flex-col overflow-hidden ${compact ? 'px-5 pb-8 pt-4' : 'px-8 pb-6 pt-5'}`}>{children}</div>
    </div>
  )
}

const CAPTION_SAMPLE: Record<SiteLang, { emotion: string; action: string; situation: string }> = {
  ko: { emotion: '반가움', action: '손을 흔들며 인사', situation: '첫 만남, 아침 인사' },
  en: { emotion: 'Cheerful', action: 'Waving hello', situation: 'First meeting, morning greeting' },
  ja: { emotion: 'うれしい', action: '手を振って挨拶', situation: '初対面、朝の挨拶' },
  zh: { emotion: '开心', action: '挥手打招呼', situation: '初次见面、早晨问候' },
}

// AI가 추천하는 문구는 항상 한국어(현지화 전 원문)이므로 언어와 무관하게 고정.
const CAPTION_CANDIDATES = [
  { text: '안녕!', best: true },
  { text: '반가워요', best: false },
  { text: '좋은 아침~', best: false },
]

export function CaptionSuggestMock({ lang, compact }: { lang: SiteLang; compact: boolean }) {
  const t = captionSuggestCopy(lang)
  const sample = CAPTION_SAMPLE[lang]
  const thumbs = [heroCharacter, heroCharacter, heroCharacter]

  return (
    <MockFrame lang={lang} compact={compact}>
      <h1 className={`${compact ? 'text-xl' : 'text-[28px]'} font-extrabold`}>{t.analyzeTitle}</h1>
      <p className="mt-1.5 text-sm text-sub">{t.analyzeSubtitle}</p>
      <div className={`mt-5 grid gap-4 ${compact ? '' : 'grid-cols-[190px_1fr]'}`}>
        <div className={`flex gap-2 ${compact ? 'overflow-hidden' : 'flex-col'}`}>
          {thumbs.map((src, index) => (
            <div key={index} className={`flex shrink-0 items-center gap-2 rounded-lg border p-2 text-xs font-bold ${index === 0 ? 'border-brand bg-brand-soft' : 'border-line bg-card'} ${compact ? 'min-w-0 flex-1 justify-between' : ''}`}>
              <img src={src} alt="" className="h-9 w-9 shrink-0 rounded object-contain" />
              {!compact && <span className="min-w-0 truncate">{index + 1}</span>}
              <span className="ml-auto shrink-0 text-sub">{index === 0 ? <Check className="h-4 w-4 text-brand" /> : t.waiting}</span>
            </div>
          ))}
        </div>
        <div className="rounded-panel border border-line p-4">
          <div className={`grid gap-4 ${compact ? '' : 'grid-cols-[1fr_1.2fr]'}`}>
            <div className={`relative mx-auto aspect-square overflow-hidden rounded-lg border border-line ${compact ? 'w-36' : 'w-full max-w-[220px]'}`}>
              <img src={heroCharacter} alt="" className="checkerboard h-full w-full object-contain" />
              <div className="absolute inset-x-3 bottom-3 flex justify-center">
                <span className="rounded-full bg-black/75 px-3 py-1 text-sm font-bold text-white">{CAPTION_CANDIDATES[0].text}</span>
              </div>
            </div>
            <div>
              <h2 className="text-xs font-bold text-sub">{t.aiAnalysis}</h2>
              <dl className="mt-1.5 space-y-0.5 text-sm">
                <div><dt className="inline font-bold">{t.emotionLabel}: </dt><dd className="inline">{sample.emotion}</dd></div>
                <div><dt className="inline font-bold">{t.actionLabel}: </dt><dd className="inline">{sample.action}</dd></div>
                {!compact && <div><dt className="inline font-bold">{t.situationLabel}: </dt><dd className="inline">{sample.situation}</dd></div>}
              </dl>
              <h2 className="mt-2 text-xs font-bold text-sub">{t.suggestedCaptions}</h2>
              <div className="mt-1.5 space-y-1">
                {CAPTION_CANDIDATES.map((candidate, index) => (
                  <div key={candidate.text} className={`flex items-center justify-between rounded-lg border p-2 text-sm ${index === 0 ? 'border-brand bg-brand-soft font-bold' : 'border-line'}`}>
                    <span>{candidate.text}</span>
                    {candidate.best && <span className="rounded-full bg-brand px-2 py-0.5 text-xs font-bold text-white">{t.recommended}</span>}
                  </div>
                ))}
              </div>
              {!compact && <>
                <p className="mt-2 text-xs font-bold text-sub">{t.position}</p>
                <div className="mt-1 flex gap-2">
                  <span className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold">{t.positionTop}</span>
                  <span className="rounded-lg bg-action px-3 py-1.5 text-xs font-bold text-white">{t.positionBottom}</span>
                </div>
              </>}
            </div>
          </div>
        </div>
      </div>
      <div className={`flex gap-3 ${compact ? 'mt-auto pt-3' : 'mt-3'}`}>
        {!compact && <span className="flex-1 rounded-lg bg-surface py-2.5 text-center text-sm font-bold">{t.backToDetect}</span>}
        <span className="flex-1 rounded-lg bg-action py-2.5 text-center text-sm font-bold text-white">{t.reviewAllAtOnce}</span>
      </div>
    </MockFrame>
  )
}
