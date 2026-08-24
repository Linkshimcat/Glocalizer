import JSZip from 'jszip'
import type { DemoItem } from '../data/demo'
import { DEFAULT_STYLE, hexToRgba, resolveText, styleFromNormalizedBox, styleKeyForRegion, type Style } from './style'

/** 에디터 화면(340px 기준)의 편집 상태를 512px 캔버스로 합성 */
const CANVAS_SIZE = 512
const EDITOR_SIZE = 340
const SCALE = CANVAS_SIZE / EDITOR_SIZE

interface DrawnImageFrame {
  x: number
  y: number
  width: number
  height: number
}

export interface TextOverlay {
  regionId: string | null
  suggestions: Array<{ text: string }>
  style: Style
}

export function textOverlaysForItem(
  item: DemoItem,
  languageCode: string,
  styles: Record<string, Record<string, Style>>,
  selectedOverride?: { regionId: string | null; style: Style },
): TextOverlay[] {
  const primaryRegionId = item.analysis?.regionId ?? null
  const regions = item.textRegions?.length
    ? item.textRegions
    : [{
        id: primaryRegionId ?? item.id,
        suggestions: item.suggestions,
        normalizedBox: item.analysis?.normalizedBox ?? null,
        textColor: item.analysis?.textColor ?? null,
        recommendedFont: item.recommendedFont,
      }]
  return regions.map(region => {
    const key = styleKeyForRegion(item.id, region.id, primaryRegionId)
    const fallback = region.normalizedBox
      ? { ...styleFromNormalizedBox(region.normalizedBox, region.textColor, region.suggestions.find(value => value.best)?.text ?? region.suggestions[0]?.text), font: region.recommendedFont }
      : DEFAULT_STYLE
    const style = selectedOverride?.regionId === region.id
      ? selectedOverride.style
      : styles[key]?.[languageCode] ?? fallback
    return { regionId: region.id, suggestions: region.suggestions, style }
  })
}

function drawTextBackground(ctx: CanvasRenderingContext2D, text: string, style: Style, fontPx: number) {
  if (!style.backgroundOn || !text) return
  const lines = text.split(/\r?\n/)
  const measuredWidth = Math.max(...lines.map(line => ctx.measureText(line).width))
  const lineHeight = fontPx * 1.15
  const padding = style.backgroundPadding * SCALE
  const width = measuredWidth + padding * 2
  const height = lineHeight * lines.length + padding * 2
  const x = -width / 2
  const y = -height / 2
  const radius = Math.min(style.backgroundRadius * SCALE, height / 2, width / 2)
  ctx.fillStyle = hexToRgba(style.backgroundColor, style.backgroundOpacity / 100)
  ctx.beginPath()
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, width, height, radius)
  } else {
    ctx.rect(x, y, width, height)
  }
  ctx.fill()
}

function drawMultilineText(ctx: CanvasRenderingContext2D, text: string, style: Style, fontPx: number) {
  const lines = text.split(/\r?\n/)
  const lineHeight = fontPx * 1.15
  const firstBaseline = -((lines.length - 1) * lineHeight) / 2
  lines.forEach((line, index) => {
    const y = firstBaseline + index * lineHeight
    if (style.strokeOn) ctx.strokeText(line, 0, y)
    ctx.fillText(line, 0, y)
  })
}

function applyManualCleanup(ctx: CanvasRenderingContext2D, style: Style, frame: DrawnImageFrame) {
  const cleanup = style.manualCleanup
  if (!cleanup) return
  const x = frame.x + cleanup.rect.x * frame.width
  const y = frame.y + cleanup.rect.y * frame.height
  const width = cleanup.rect.width * frame.width
  const height = cleanup.rect.height * frame.height
  const radius = Math.min(width / 2, height / 2, Math.max(0, cleanup.radius ?? 0) * Math.min(width, height))
  ctx.save()
  ctx.beginPath()
  if (radius > 0 && typeof ctx.roundRect === 'function') ctx.roundRect(x, y, width, height, radius)
  else ctx.rect(x, y, width, height)
  ctx.clip()
  if (cleanup.mode === 'transparent') {
    ctx.globalCompositeOperation = 'destination-out'
    ctx.fillRect(x, y, width, height)
  } else {
    ctx.fillStyle = cleanup.color ?? '#FFFFFF'
    ctx.fillRect(x, y, width, height)
  }
  ctx.restore()
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    // Supabase signed URL도 CORS 허용 시 export 가능한 Canvas로 불러온다.
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`이미지를 불러오지 못했어요: ${url}`))
    img.src = url
  })
}

/** 원본 이미지 + 번역 텍스트를 합성한 PNG Blob 생성 */
export async function renderItemToPng(item: DemoItem, style: Style, overlays?: TextOverlay[]): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_SIZE
  canvas.height = CANVAS_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('캔버스를 만들 수 없어요')

  if (!style.transparent) {
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
  }

  // 원본 이미지 (에디터와 동일: 캔버스에 꽉 차게 object-contain + 배율)
  const imageScale = (style.imageScale ?? 100) / 100
  if (item.url) {
    const img = await loadImage(item.url)
    // 캔버스(패딩 2px 제외)에 맞춰 contain
    const box = CANVAS_SIZE - 8
    const contain = Math.min(box / img.width, box / img.height) * imageScale
    const w = img.width * contain
    const h = img.height * contain
    const frame = { x: (CANVAS_SIZE - w) / 2, y: (CANVAS_SIZE - h) / 2, width: w, height: h }
    ctx.drawImage(img, frame.x, frame.y, frame.width, frame.height)
    for (const overlay of overlays ?? [{ regionId: item.analysis?.regionId ?? null, suggestions: item.suggestions, style }]) {
      applyManualCleanup(ctx, overlay.style, frame)
    }
    try {
      ctx.getImageData(0, 0, 1, 1)
    } catch {
      throw new Error('이미지 보안 설정 때문에 PNG를 만들 수 없어요. Storage CORS 설정을 확인해주세요.')
    }
  } else {
    ctx.font = `${Math.round(120 * SCALE * imageScale)}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(item.emoji, CANVAS_SIZE / 2, CANVAS_SIZE / 2)
  }

  for (const overlay of overlays ?? [{ regionId: item.analysis?.regionId ?? null, suggestions: item.suggestions, style }]) {
    const overlayStyle = overlay.style
    const text = resolveText(overlayStyle, overlay.suggestions)
    if (!text) continue
    const fontPx = Math.round(overlayStyle.size * SCALE)
    const fontSpec = `${overlayStyle.weight} ${fontPx}px '${overlayStyle.font}', sans-serif`
    try {
      await document.fonts.load(fontSpec, text)
    } catch {
      // 폰트 로드 실패 시 폴백 폰트로 진행
    }

    ctx.save()
    ctx.translate(CANVAS_SIZE / 2 + overlayStyle.x * SCALE, CANVAS_SIZE / 2 + overlayStyle.y * SCALE)
    ctx.rotate((overlayStyle.rotation * Math.PI) / 180)
    ctx.font = fontSpec
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    drawTextBackground(ctx, text, overlayStyle, fontPx)
    if (overlayStyle.shadowOn) {
      ctx.shadowColor = hexToRgba(overlayStyle.shadowColor, overlayStyle.shadowOpacity / 100)
      ctx.shadowBlur = overlayStyle.shadowBlur * SCALE
      ctx.shadowOffsetX = overlayStyle.shadowX * SCALE
      ctx.shadowOffsetY = overlayStyle.shadowY * SCALE
    }
    if (overlayStyle.strokeOn) {
      ctx.lineWidth = overlayStyle.strokeWidth * 2 * SCALE
      ctx.strokeStyle = overlayStyle.strokeColor
      ctx.lineJoin = 'round'
    }
    ctx.fillStyle = overlayStyle.color
    drawMultilineText(ctx, text, overlayStyle, fontPx)
    ctx.restore()
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error('PNG 생성에 실패했어요'))),
      'image/png',
    )
  })
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function baseName(name: string) {
  return name.replace(/\.[^.]+$/, '')
}

/** 원본파일명_언어코드.확장자 (예: 열공_en.png) */
export function exportFileName(name: string, lang: string, ext: string) {
  return `${baseName(name)}_${lang}.${ext}`
}

/** Dashboard에서 선택한 언어별 편집 결과를 한 ZIP으로 생성한다. */
export async function zipLocalizedItems(
  itemsByLanguage: Array<{ languageCode: string; items: DemoItem[] }>,
  styles: Record<string, Record<string, Style>>,
): Promise<Blob> {
  const zip = new JSZip()
  for (const { languageCode, items } of itemsByLanguage) {
    for (const item of items) {
      const style = styles[item.id]?.[languageCode] ?? DEFAULT_STYLE
      const overlays = textOverlaysForItem(item, languageCode, styles)
      zip.file(exportFileName(item.name, languageCode, 'png'), await renderItemToPng(item, style, overlays))
    }
  }
  return zip.generateAsync({ type: 'blob' })
}
