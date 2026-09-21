import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { fetchOgqStickers, type OgqSticker } from '../lib/api'
import { useSiteLang } from '../i18n/LanguageContext'

export default function OgqStickerGallery({ fallbackImage }: { fallbackImage?: string }) {
  const { t } = useSiteLang()
  const [stickers, setStickers] = useState<OgqSticker[] | null>(null)
  const sceneRef = useRef<HTMLDivElement>(null)
  const pointerFrameRef = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchOgqStickers(12)
      .then(result => { if (!cancelled) setStickers(result) })
      .catch(() => { if (!cancelled) setStickers([]) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => () => {
    if (pointerFrameRef.current !== null) cancelAnimationFrame(pointerFrameRef.current)
  }, [])

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch') return

    const scene = sceneRef.current
    if (!scene) return

    const { left, top, width, height } = scene.getBoundingClientRect()
    const pointerX = ((event.clientX - left) / width - 0.5) * 2
    const pointerY = ((event.clientY - top) / height - 0.5) * 2

    if (pointerFrameRef.current !== null) cancelAnimationFrame(pointerFrameRef.current)
    pointerFrameRef.current = requestAnimationFrame(() => {
      scene.style.setProperty('--tilt-x', `${(pointerY * -4).toFixed(2)}deg`)
      scene.style.setProperty('--tilt-y', `${(pointerX * 6).toFixed(2)}deg`)
      pointerFrameRef.current = null
    })
  }

  const handlePointerLeave = () => {
    const scene = sceneRef.current
    if (!scene) return
    if (pointerFrameRef.current !== null) cancelAnimationFrame(pointerFrameRef.current)
    pointerFrameRef.current = null
    scene.style.setProperty('--tilt-x', '0deg')
    scene.style.setProperty('--tilt-y', '0deg')
  }

  // OGQ 연동이 꺼져 있거나 조회에 실패하면 기본 랜딩에서는 조용히 숨기고,
  // 시각 자료가 전달된 화면에서는 같은 갤러리의 정적 버전을 유지한다.
  if (stickers !== null && stickers.length === 0) {
    return fallbackImage ? <img src={fallbackImage} alt={t.ogqGalleryTitle} className="ogq-gallery-fallback" /> : null
  }

  return (
    <section className="mx-auto w-full max-w-[1600px] px-5 py-16 sm:px-10 sm:py-20 lg:px-16">
      <div className="text-center">
        <h2 className="text-[26px] font-extrabold tracking-tight sm:text-[32px]">{t.ogqGalleryTitle}</h2>
        <p className="mt-3 text-[15px] font-medium text-sub sm:text-[17px]">{t.ogqGalleryDesc}</p>
      </div>
      <div className="ogq-tilt-mask mt-8 sm:mt-10">
        <div
          ref={sceneRef}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          className="ogq-tilt-scene"
        >
          <div className="ogq-tilt-plane grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 md:grid-cols-6">
            {(stickers ?? Array.from<OgqSticker | undefined>({ length: 12 })).map((sticker, index) => (
              <div
                key={sticker?.assetId ?? index}
                className="ogq-tilt-card aspect-square overflow-hidden rounded-2xl border border-black/[0.06] bg-white"
              >
                {sticker ? (
                  <img src={sticker.thumbnailUrl} alt={sticker.title ?? ''} loading="lazy" className="h-full w-full object-contain p-3" />
                ) : (
                  <div className="h-full w-full animate-pulse bg-surface" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div aria-hidden="true" className="ogq-gallery-base" />
      <p className="mt-6 text-center text-xs font-medium text-sub">{t.ogqGalleryCredit}</p>
    </section>
  )
}
