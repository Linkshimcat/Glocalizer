import { Check } from 'lucide-react'
import heroCharacter from '../assets/studio/hero-character.webp'
import { STICKER_TRENDS } from '../data/stickerTrends'
import { captionSuggestCopy } from '../i18n/captionSuggest'
import { stickerTrendsCopy } from '../i18n/stickerTrends'
import type { SiteLang } from '../i18n/translations'
import StickerGrid from './StickerGrid'

/**
 * 랜딩 스토리 장면용 정적 목업. 실제 /caption-suggest는 업로드·프로젝트가 없으면 리다이렉트되고
 * /trends는 한국 탭이 라이브 OGQ API를 호출하므로, iframe 대신 같은 마크업을 데이터 고정으로 그린다.
 * 부모(LiveProductScreen)가 가상 뷰포트 크기를 주고 scale로 축소한다.
 */

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
    <div className={`remake-mock h-full w-full bg-card ${compact ? 'p-5 pt-14' : 'p-8'}`}>
      <h1 className={`${compact ? 'text-xl' : 'text-[28px]'} font-extrabold`}>{t.analyzeTitle}</h1>
      <p className="mt-1.5 text-sm text-sub">{t.analyzeSubtitle}</p>
      <div className={`mt-5 grid gap-4 ${compact ? '' : 'grid-cols-[190px_1fr]'}`}>
        <div className={`flex gap-2 ${compact ? 'overflow-hidden' : 'flex-col'}`}>
          {thumbs.map((src, index) => (
            <div key={index} className={`flex shrink-0 items-center gap-2 rounded-lg border p-2 text-xs font-bold ${index === 0 ? 'border-brand bg-brand-soft' : 'border-line bg-card'} ${compact ? 'w-28' : ''}`}>
              <img src={src} alt="" className="h-9 w-9 shrink-0 rounded object-contain" />
              <span className="min-w-0 truncate">{index + 1}</span>
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
              <h2 className="mt-3 text-xs font-bold text-sub">{t.suggestedCaptions}</h2>
              <div className="mt-1.5 space-y-1.5">
                {CAPTION_CANDIDATES.map((candidate, index) => (
                  <div key={candidate.text} className={`flex items-center justify-between rounded-lg border p-2 text-sm ${index === 0 ? 'border-brand bg-brand-soft font-bold' : 'border-line'}`}>
                    <span>{candidate.text}</span>
                    {candidate.best && <span className="rounded-full bg-brand px-2 py-0.5 text-xs font-bold text-white">{t.recommended}</span>}
                  </div>
                ))}
              </div>
              {!compact && <>
                <p className="mt-3 text-xs font-bold text-sub">{t.customInput}</p>
                <div className="mt-1 rounded-lg border border-line px-3 py-2 text-sm text-sub">{t.customPlaceholder}</div>
                <p className="mt-3 text-xs font-bold text-sub">{t.position}</p>
                <div className="mt-1 flex gap-2">
                  <span className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold">{t.positionTop}</span>
                  <span className="rounded-lg bg-action px-3 py-1.5 text-xs font-bold text-white">{t.positionBottom}</span>
                </div>
              </>}
            </div>
          </div>
        </div>
      </div>
      {!compact && <div className="mt-5 flex gap-3">
        <span className="flex-1 rounded-lg bg-surface py-3 text-center text-sm font-bold">{t.backToDetect}</span>
        <span className="flex-1 rounded-lg bg-action py-3 text-center text-sm font-bold text-white">{t.reviewAllAtOnce}</span>
      </div>}
    </div>
  )
}

const TREND_TABS = ['KR', 'JP', 'CN', 'US'] as const

export function TrendsMock({ lang, compact }: { lang: SiteLang; compact: boolean }) {
  const t = stickerTrendsCopy(lang)
  const labels = { KR: t.tabKorea, JP: t.tabJapan, CN: t.tabChina, US: t.tabUs }
  const items = STICKER_TRENDS.JP.slice(0, compact ? 12 : 18).map(sticker => ({ ...sticker, title: t.stickerAlt }))

  return (
    <div className={`remake-mock h-full w-full bg-card ${compact ? 'p-5 pt-14' : 'p-8'}`}>
      <h1 className={`${compact ? 'text-xl' : 'text-[30px]'} font-extrabold tracking-tight`}>{t.title}</h1>
      <p className="mt-2 text-sm text-sub">{t.subtitle}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {TREND_TABS.map(tab => (
          <span key={tab} className={`rounded-full px-4 py-2 text-sm font-bold ${tab === 'JP' ? 'bg-action text-white' : 'border border-line bg-card text-ink'}`}>{labels[tab]}</span>
        ))}
      </div>
      <p className="mt-3 text-xs font-semibold text-sub">{t.sourceLine}</p>
      <div className="mt-3">
        <StickerGrid items={items} emptyLabel={t.curationPending} />
      </div>
    </div>
  )
}
