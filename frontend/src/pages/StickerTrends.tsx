import { useCallback, useEffect, useState } from 'react'
import { fetchOgqStickers } from '../lib/api'
import { STICKER_TRENDS } from '../data/stickerTrends'
import { useSiteLang } from '../i18n/LanguageContext'
import { stickerTrendsCopy } from '../i18n/stickerTrends'
import StickerGrid, { type GridSticker } from '../components/StickerGrid'

const TABS = ['KR', 'JP', 'CN', 'US'] as const
type Tab = typeof TABS[number]

const STICKER_LIMIT = 24

export default function StickerTrends() {
  const { lang } = useSiteLang()
  const t = stickerTrendsCopy(lang)
  const tabLabel: Record<Tab, string> = { KR: t.tabKorea, JP: t.tabJapan, CN: t.tabChina, US: t.tabUs }
  const sourceLabel: Record<Tab, string> = { KR: t.sourceOgq, JP: t.sourceCurated, CN: t.sourceCurated, US: t.sourceCurated }

  const [activeTab, setActiveTab] = useState<Tab>('KR')
  const [ogqCache, setOgqCache] = useState<GridSticker[]>()
  const [ogqError, setOgqError] = useState<string>()

  const loadKorea = useCallback(async () => {
    setOgqError(undefined)
    try {
      const stickers = await fetchOgqStickers(STICKER_LIMIT)
      setOgqCache(stickers.map(sticker => ({ id: sticker.assetId, title: sticker.title ?? '', thumbnailUrl: sticker.thumbnailUrl })))
    } catch (error) {
      setOgqCache([])
      setOgqError(error instanceof Error ? error.message : undefined)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'KR' && ogqCache === undefined) void loadKorea()
  }, [activeTab, ogqCache, loadKorea])

  const items = activeTab === 'KR' ? (ogqCache ?? null) : STICKER_TRENDS[activeTab]
  const emptyLabel = activeTab === 'KR' ? (ogqError ?? t.empty) : t.curationPending

  return (
    <main id="main-content" tabIndex={-1} className="layout-app py-10 sm:py-16">
      <h1 className="text-[30px] font-extrabold tracking-tight sm:text-[38px]">{t.title}</h1>
      <p className="mt-3 text-base text-sub">{t.subtitle}</p>

      <div role="tablist" className="mt-8 flex flex-wrap gap-2">
        {TABS.map(tab => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-full px-5 py-2.5 text-sm font-bold transition-colors ${
              activeTab === tab ? 'bg-action text-white' : 'border border-line bg-card text-ink hover:bg-surface'
            }`}
          >
            {tabLabel[tab]}
          </button>
        ))}
      </div>

      <p className="mt-4 text-xs font-semibold text-sub">{sourceLabel[activeTab]}</p>

      <div className="mt-4">
        <StickerGrid
          items={items}
          emptyLabel={emptyLabel}
          retryLabel={t.retry}
          onRetry={activeTab === 'KR' ? () => { setOgqCache(undefined) } : undefined}
        />
      </div>
    </main>
  )
}
