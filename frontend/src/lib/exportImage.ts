import JSZip from 'jszip'
import type { DemoItem } from '../data/demo'
import { DEFAULT_STYLE, hexToRgba, resolveText, type Style } from './style'

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

function drawTextBackground(ctx: CanvasRenderingContext2D, text: string, style: Style, fontPx: number) {
  if (!style.backgroundOn || !text) return
  const metrics = ctx.measureText(text)
  const padding = style.backgroundPadding * SCALE
  const width = metrics.width + padding * 2
  const height = fontPx + padding * 2
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

function applyManualCleanup(ctx: CanvasRenderingContext2D, style: Style, frame: DrawnImageFrame) {
  const cleanup = style.manualCleanup
  if (!cleanup) return
  const x = frame.x + cleanup.rect.x * frame.width
  const y = frame.y + cleanup.rect.y * frame.height
  const width = cleanup.rect.width * frame.width
  const height = cleanup.rect.height * frame.height
  ctx.save()
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
export async function renderItemToPng(item: DemoItem, style: Style): Promise<Blob> {
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
    applyManualCleanup(ctx, style, frame)
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

  // 번역 텍스트
  const text = resolveText(style, item.suggestions)
  const weight = style.weight
  const fontPx = Math.round(style.size * SCALE)
  const fontSpec = `${weight} ${fontPx}px '${style.font}', sans-serif`
  try {
    await document.fonts.load(fontSpec, text)
  } catch {
    // 폰트 로드 실패 시 폴백 폰트로 진행
  }

  ctx.save()
  ctx.translate(
    CANVAS_SIZE / 2 + style.x * SCALE,
    CANVAS_SIZE / 2 + style.y * SCALE,
  )
  ctx.rotate((style.rotation * Math.PI) / 180)
  ctx.font = fontSpec
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  drawTextBackground(ctx, text, style, fontPx)
  if (style.shadowOn) {
    ctx.shadowColor = hexToRgba(style.shadowColor, style.shadowOpacity / 100)
    ctx.shadowBlur = style.shadowBlur * SCALE
    ctx.shadowOffsetX = style.shadowX * SCALE
    ctx.shadowOffsetY = style.shadowY * SCALE
  }
  if (style.strokeOn) {
    ctx.lineWidth = style.strokeWidth * 2 * SCALE
    ctx.strokeStyle = style.strokeColor
    ctx.lineJoin = 'round'
    ctx.strokeText(text, 0, 0)
  }
  ctx.fillStyle = style.color
  ctx.fillText(text, 0, 0)
  ctx.restore()

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
      zip.file(exportFileName(item.name, languageCode, 'png'), await renderItemToPng(item, style))
    }
  }
  return zip.generateAsync({ type: 'blob' })
}
