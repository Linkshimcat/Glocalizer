import { useEffect, useState } from 'react'
import Modal from './Modal'
import { fetchOgqStickers, type OgqSticker } from '../lib/api'
import { useSiteLang } from '../i18n/LanguageContext'

interface OgqSamplePickerProps {
  onClose: () => void
  onSelect: (sticker: OgqSticker) => void
  selectingId: string | null
}

export default function OgqSamplePicker({ onClose, onSelect, selectingId }: OgqSamplePickerProps) {
  const { t } = useSiteLang()
  const [stickers, setStickers] = useState<OgqSticker[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchOgqStickers(24)
      .then(result => { if (!cancelled) setStickers(result) })
      .catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true }
  }, [])

  return (
    <Modal onClose={onClose} labelledBy="ogq-sample-picker-title" closeLabel={t.commonClose}>
      <h2 id="ogq-sample-picker-title" className="text-lg font-bold">{t.samplePickerTitle}</h2>
      <p className="mt-1 text-sm font-medium text-sub">{t.samplePickerDesc}</p>

      {failed && <p className="mt-6 text-sm font-medium text-sub">{t.samplePickerError}</p>}
      {!failed && stickers?.length === 0 && <p className="mt-6 text-sm font-medium text-sub">{t.samplePickerEmpty}</p>}
      {!failed && stickers === null && <p className="mt-6 text-sm font-medium text-sub">{t.samplePickerLoading}</p>}

      {stickers && stickers.length > 0 && (
        <div className="mt-5 grid max-h-[60vh] auto-rows-min grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3">
          {stickers.map(sticker => (
            <button
              key={sticker.assetId}
              type="button"
              disabled={selectingId !== null}
              onClick={() => onSelect(sticker)}
              className="relative aspect-square w-full overflow-hidden rounded-2xl border-2 border-gray-100 bg-white transition-colors hover:border-brand disabled:cursor-not-allowed disabled:opacity-50"
            >
              <img src={sticker.thumbnailUrl} alt={sticker.title ?? ''} loading="lazy" className="absolute inset-0 h-full w-full object-contain p-2" />
            </button>
          ))}
        </div>
      )}
    </Modal>
  )
}
