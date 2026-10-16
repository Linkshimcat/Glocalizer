export interface GridSticker {
  id: string
  title: string
  thumbnailUrl: string
}

interface StickerGridProps {
  items: GridSticker[] | null
  emptyLabel: string
  retryLabel?: string
  onRetry?: () => void
}

/** OgqStickerGallery의 카드 마크업(테두리·배경·스켈레톤)을 그대로 쓰되, 랜딩 전용 3D 틸트 연출은 뺀 정적 그리드. */
export default function StickerGrid({ items, emptyLabel, retryLabel, onRetry }: StickerGridProps) {
  if (items?.length === 0) {
    return (
      <div className="ogq-gallery-error">
        <p role="status">{emptyLabel}</p>
        {onRetry && <button type="button" onClick={onRetry}>{retryLabel}</button>}
      </div>
    )
  }

  return (
    <div aria-busy={items === null} className="grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 md:grid-cols-6">
      {(items ?? Array.from<GridSticker | undefined>({ length: 12 })).map((sticker, index) => (
        <div
          key={sticker?.id ?? index}
          className="aspect-square overflow-hidden rounded-panel border border-black/[0.06] bg-white"
        >
          {sticker ? (
            <img src={sticker.thumbnailUrl} alt={sticker.title} loading="lazy" className="h-full w-full object-contain p-3" />
          ) : (
            <div className="h-full w-full animate-pulse bg-surface" />
          )}
        </div>
      ))}
    </div>
  )
}
