import { useEffect, useState } from 'react'
import { fetchOgqStickers, type OgqSticker } from '../lib/api'
import { useSiteLang } from '../i18n/LanguageContext'

export default function OgqStickerGallery() {
  const { t } = useSiteLang()
  const [stickers, setStickers] = useState<OgqSticker[] | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchOgqStickers(12)
      .then(result => { if (!cancelled) setStickers(result) })
      .catch(() => { if (!cancelled) setStickers([]) })
    return () => { cancelled = true }
  }, [])

  // OGQ 연동이 꺼져 있거나 조회에 실패하면, 랜딩페이지에는 조용히 섹션 자체를 숨긴다.
  if (stickers !== null && stickers.length === 0) return null

  return (
    <section className="mx-auto w-full max-w-[1600px] px-5 py-16 sm:px-10 sm:py-20 lg:px-16">
      <div className="text-center">
        <h2 className="text-[26px] font-extrabold tracking-tight sm:text-[32px]">{t.ogqGalleryTitle}</h2>
        <p className="mt-3 text-[15px] font-medium text-sub sm:text-[17px]">{t.ogqGalleryDesc}</p>
      </div>
      <div className="mt-10 grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 md:grid-cols-6">
        {(stickers ?? Array.from<OgqSticker | undefined>({ length: 12 })).map((sticker, index) => (
          <div
            key={sticker?.assetId ?? index}
            className="aspect-square overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.05)]"
          >
            {sticker ? (
              <img src={sticker.thumbnailUrl} alt={sticker.title ?? ''} loading="lazy" className="h-full w-full object-contain p-3" />
            ) : (
              <div className="h-full w-full animate-pulse bg-surface" />
            )}
          </div>
        ))}
      </div>
      <p className="mt-6 text-center text-xs font-medium text-sub">{t.ogqGalleryCredit}</p>
    </section>
  )
}
