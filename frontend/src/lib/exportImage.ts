import JSZip from 'jszip'
import { isGif, type DemoItem } from '../data/demo'
import { DEFAULT_STYLE, hexToRgba, resolveText, type Style } from './style'

/** 에디터 화면(340px 기준)의 편집 상태를 512px 캔버스로 합성 */
const CANVAS_SIZE = 512
const EDITOR_SIZE = 340
const SCALE = CANVAS_SIZE / EDITOR_SIZE

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
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
    ctx.drawImage(img, (CANVAS_SIZE - w) / 2, (CANVAS_SIZE - h) / 2, w, h)
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

/** 전체 이모티콘을 합성 PNG(+GIF 원본)로 묶은 ZIP 생성 */
export async function zipItems(
  items: DemoItem[],
  styles: Record<string, Style>,
  lang: string,
): Promise<Blob> {
  const zip = new JSZip()
  for (const item of items) {
    const style = styles[item.id] ?? DEFAULT_STYLE
    zip.file(exportFileName(item.name, lang, 'png'), await renderItemToPng(item, style))
    if (isGif(item) && item.url) {
      const original = await fetch(item.url).then(r => r.blob())
      zip.file(`${baseName(item.name)}_original.gif`, original)
    }
  }
  return zip.generateAsync({ type: 'blob' })
}
