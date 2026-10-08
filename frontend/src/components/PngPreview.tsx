import { LoaderCircle } from 'lucide-react'
import type { DemoItem } from '../data/demo'
import { usePngPreview } from '../hooks/usePngPreview'
import { useSiteLang } from '../i18n/LanguageContext'
import { workflowCopy } from '../i18n/workflow'
import type { Style } from '../lib/style'
import type { OutputPreset, TextOverlay } from '../lib/exportImage'

export default function PngPreview({ item, overlays, preset, onEnlarge, baseStyle, large = false }: {
  item: DemoItem; overlays: TextOverlay[]; preset: OutputPreset; onEnlarge?: () => void; baseStyle: Style; large?: boolean
}) {
  const { lang } = useSiteLang()
  const w = workflowCopy[lang]
  const { url, error, retry } = usePngPreview(item, overlays, preset, baseStyle)
  const surface = `checkerboard flex w-full items-center justify-center overflow-hidden rounded-xl ${large ? 'min-h-60' : 'aspect-square'}`
  if (error) return <div role="alert" className={`${surface} flex-col gap-3 p-4 text-center text-sm`}><p>{w.previewFailed}</p><button type="button" onClick={retry} className="rounded-control border border-gray-300 bg-white px-3 py-2">{w.retry}</button></div>
  if (!url) return <div role="status" aria-label={w.preparing} className={surface}><LoaderCircle aria-hidden="true" className="h-6 w-6 animate-spin text-sub motion-reduce:animate-none" /></div>
  const img = <img src={url} alt={item.name} className={`block w-full object-contain ${large ? 'max-h-[65dvh]' : 'h-full'}`} />
  return onEnlarge
    ? <button type="button" aria-label={`${w.preview}: ${item.name}`} title={w.preview} onClick={onEnlarge} className={`${surface} focus-visible:outline-2 focus-visible:outline-brand`}>{img}</button>
    : <div className={surface}>{img}</div>
}
