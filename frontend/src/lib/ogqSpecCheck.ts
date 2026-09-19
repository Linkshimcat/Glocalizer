export type OgqImageCategory = 'main' | 'sticker' | 'tab'

export type OgqSpecCheckKey = 'format' | 'size' | 'dimensions' | 'transparency' | 'margin'
export type OgqSpecCheckStatus = 'pass' | 'fail' | 'warn'

export interface OgqSpecCheckItem {
  key: OgqSpecCheckKey
  status: OgqSpecCheckStatus
}

export interface OgqSpecCheckResult {
  fileName: string
  fileSizeBytes: number
  fileType: string
  width: number
  height: number
  category: OgqImageCategory | null
  marginRatio: number | null
  previewUrl: string
  items: OgqSpecCheckItem[]
}

// OGQ 크리에이터 스튜디오 공식 제작 가이드 기준.
export const OGQ_CATEGORY_DIMENSIONS: Record<OgqImageCategory, { width: number; height: number }> = {
  main: { width: 240, height: 240 },
  sticker: { width: 740, height: 640 },
  tab: { width: 96, height: 74 },
}

const MAX_FILE_BYTES = 1024 * 1024
// 캐릭터가 캔버스 가장자리에서 최소 이만큼(짧은 변 기준 비율)은 떨어져 있어야 여백이 있다고 본다.
const MARGIN_MIN_RATIO = 0.04
// PNG라도 무손실 압축 과정에서 알파값이 250~255 사이로 미세하게 섞이는 경우가 있어,
// 완전 불투명(255)만 기준으로 삼으면 오탐이 나서 여유를 둔다.
const OPAQUE_ALPHA_THRESHOLD = 250
const TRANSPARENT_ALPHA_THRESHOLD = 10

function matchCategory(width: number, height: number): OgqImageCategory | null {
  const entry = (Object.entries(OGQ_CATEGORY_DIMENSIONS) as [OgqImageCategory, { width: number; height: number }][])
    .find(([, size]) => size.width === width && size.height === height)
  return entry ? entry[0] : null
}

function loadImage(file: File): Promise<{ img: HTMLImageElement; url: string }> {
  const url = URL.createObjectURL(file)
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ img, url })
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error(`Could not load image: ${file.name}`))
    }
    img.src = url
  })
}

// 알파 채널 유무와 캐릭터 주변 여백을, 실제로 픽셀을 훑어서 확인한다 — 파일명이나
// MIME 타입만으로는 PNG가 정말 투명 배경을 쓰는지, 캐릭터가 가장자리에 붙어있는지 알 수 없다.
function analyzePixels(img: HTMLImageElement): { hasTransparency: boolean; marginRatio: number | null } {
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return { hasTransparency: false, marginRatio: null }

  ctx.drawImage(img, 0, 0)
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height)

  let hasTransparency = false
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3]
      if (alpha < OPAQUE_ALPHA_THRESHOLD) hasTransparency = true
      if (alpha > TRANSPARENT_ALPHA_THRESHOLD) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }

  // 배경이 아예 불투명하면(hasTransparency=false) 캐릭터 영역을 픽셀만으로 분리할 수 없어
  // 여백도 측정 불가로 둔다 — 경쟁사 도구도 같은 이유로 이 경우 여백을 "측정 불가" 처리한다.
  if (!hasTransparency || maxX < 0) return { hasTransparency, marginRatio: null }

  const marginPx = Math.min(minX, minY, width - 1 - maxX, height - 1 - maxY)
  const marginRatio = marginPx / Math.min(width, height)
  return { hasTransparency, marginRatio }
}

export async function checkOgqSpec(file: File): Promise<OgqSpecCheckResult> {
  const { img, url } = await loadImage(file)
  const width = img.naturalWidth
  const height = img.naturalHeight
  const category = matchCategory(width, height)
  const { hasTransparency, marginRatio } = analyzePixels(img)

  const items: OgqSpecCheckItem[] = [
    { key: 'format', status: file.type === 'image/png' ? 'pass' : 'fail' },
    { key: 'size', status: file.size <= MAX_FILE_BYTES ? 'pass' : 'fail' },
    { key: 'dimensions', status: category ? 'pass' : 'fail' },
    { key: 'transparency', status: hasTransparency ? 'pass' : 'fail' },
    { key: 'margin', status: marginRatio === null ? 'warn' : marginRatio >= MARGIN_MIN_RATIO ? 'pass' : 'warn' },
  ]

  return {
    fileName: file.name,
    fileSizeBytes: file.size,
    fileType: file.type,
    width,
    height,
    category,
    marginRatio,
    previewUrl: url,
    items,
  }
}
