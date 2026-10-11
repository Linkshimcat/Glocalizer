import { useEffect, useState } from 'react'
import type { Style } from '../lib/style'
import type { DemoItem } from '../data/demo'
import { renderItemToPng, type OutputPreset, type TextOverlay } from '../lib/exportImage'
import '../editor-fonts.css'

let activeRenders = 0
const waiting: Array<() => void> = []
async function schedule<T>(work: () => Promise<T>): Promise<T> {
  if (activeRenders >= 3) await new Promise<void>(resolve => waiting.push(resolve))
  else activeRenders += 1
  try { return await work() } finally {
    const next = waiting.shift()
    if (next) next()
    else activeRenders -= 1
  }
}

/** A preview uses exactly the same renderer, regions and preset as its download. */
export function usePngPreview(item: DemoItem, overlays: TextOverlay[], preset: OutputPreset, baseStyle: Style) {
  const input = JSON.stringify({ item, overlays, preset, baseStyle })
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<{ key: string; url?: string; error?: boolean }>({ key: '' })
  useEffect(() => {
    let cancelled = false
    let objectUrl: string | undefined
    const timer = setTimeout(() => {
      const parsed = JSON.parse(input) as { item: DemoItem; overlays: TextOverlay[]; preset: OutputPreset; baseStyle: Style }
      void schedule(async () => {
        if (cancelled) return
        const blob = await renderItemToPng(parsed.item, parsed.baseStyle, parsed.overlays, parsed.preset)
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setState({ key: input, url: objectUrl })
      }).catch(() => { if (!cancelled) setState({ key: input, error: true }) })
    }, 150)
    return () => {
      cancelled = true
      clearTimeout(timer)
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [input, attempt])
  const current = state.key === input ? state : undefined
  return { url: current?.url, error: current?.error, retry: () => { setState({ key: '' }); setAttempt(value => value + 1) } }
}
