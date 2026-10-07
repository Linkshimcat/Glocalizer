import type { DemoItem } from '../data/demo'
import { textOverlaysForItem } from './exportImage'
import { styleKeyForRegion, type Style } from './style'

export interface FrameTextEdit { fileId: string; regionId: string | null; style: Style; previousText: string }

export function frameTextEdits(items: DemoItem[], languageCode: string, styles: Record<string, Record<string, Style>>, text: string,
  active?: { fileId: string; regionId: string | null; style: Style }): FrameTextEdit[] {
  // A failed OCR frame has no server region to save. Leave it for explicit region correction.
  return items.filter(item => !item.analysis || item.analysis.regionId || item.textRegions?.length).map(item => {
    const overlays = textOverlaysForItem(item, languageCode, styles)
    const primary = overlays.find(overlay => overlay.regionId === item.analysis?.regionId) ?? overlays[0]
    const key = styleKeyForRegion(item.id, primary.regionId, item.analysis?.regionId)
    const current = active?.fileId === item.id && styleKeyForRegion(item.id, active.regionId, item.analysis?.regionId) === key ? active.style : primary.style
    return { fileId: item.id, regionId: primary.regionId, previousText: current.customText, style: { ...current, customText: text } }
  })
}
