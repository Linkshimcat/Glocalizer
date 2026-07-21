import type { UploadFile } from '../store/uploads'
import type { ProjectResultAsset, TargetLanguageCode } from '../lib/api/types'

/** OCR/번역 API 연동 전, 시연용 데모 데이터 */

export interface Suggestion {
  text: string
  tone: string
  best?: boolean
}

/** 이미지 안의 개별 텍스트 영역 (다중 영역 편집 단위) */
export interface EditorRegion {
  regionId: string
  korean: string
  suggestions: Suggestion[]
  recommendedFont: string
  /** OCR 박스 중심 기반 초기 위치 (캔버스 중앙=0 기준 px) */
  pos: { x: number; y: number }
  /** OCR 박스 높이 기반 초기 글자 크기 (px) */
  size: number
}

export interface DemoItem {
  id: string
  name: string
  type?: string
  url?: string
  emoji: string
  korean: string
  suggestions: Suggestion[]
  /** 원본 이미지 글씨체와 어울리는 AI 추천 폰트 (API 연동 전 데모값) */
  recommendedFont: string
  originalUrl?: string
  cleanedUrl?: string
  regionId?: string
  /** 감지된 모든 텍스트 영역. 데모 데이터엔 없을 수 있어 itemRegions()로 접근한다. */
  regions?: EditorRegion[]
}

/** DemoItem의 편집 대상 영역 목록. regions가 없으면 상단 필드로 단일 영역을 만든다(데모 데이터 대응). */
export function itemRegions(item: DemoItem): EditorRegion[] {
  if (item.regions && item.regions.length > 0) return item.regions
  return [
    {
      regionId: item.regionId ?? item.id,
      korean: item.korean,
      suggestions: item.suggestions,
      recommendedFont: item.recommendedFont,
      pos: { x: 0, y: 105 },
      size: 28,
    },
  ]
}

export const DEMO_ITEMS: DemoItem[] = [
  {
    id: 'demo-1',
    name: '열공.png',
    emoji: '🤓',
    korean: '열공',
    suggestions: [
      { text: 'Grinding 🔥', tone: '추천', best: true },
      { text: 'Locked In 💪', tone: '집중' },
      { text: 'Study Hard 📚', tone: '직역' },
    ],
    recommendedFont: 'Luckiest Guy',
  },
  {
    id: 'demo-2',
    name: '대박.png',
    emoji: '😲',
    korean: '대박',
    suggestions: [
      { text: 'No way! 😱', tone: '추천', best: true },
      { text: 'Slay! ✨', tone: '트렌디' },
      { text: 'Awesome!', tone: '직역' },
    ],
    recommendedFont: 'Bangers',
  },
  {
    id: 'demo-3',
    name: '인정.png',
    emoji: '👍',
    korean: '인정',
    suggestions: [
      { text: 'Fr 💯', tone: '추천', best: true },
      { text: 'True that', tone: '캐주얼' },
      { text: 'Agreed', tone: '직역' },
    ],
    recommendedFont: 'Anton',
  },
]

export interface FontWeight {
  label: string
  value: number
}

export interface FontDef {
  name: string
  /** 이 폰트가 실제로 지원(로드)하는 굵기 목록 */
  weights: FontWeight[]
}

// 굵기 프리셋
const FULL: FontWeight[] = [
  { label: 'Thin', value: 200 },
  { label: 'Regular', value: 400 },
  { label: 'Medium', value: 500 },
  { label: 'Bold', value: 800 },
]
const REG_MED_SEMI_BOLD: FontWeight[] = [
  { label: 'Regular', value: 400 },
  { label: 'Medium', value: 500 },
  { label: 'SemiBold', value: 600 },
  { label: 'Bold', value: 700 },
]
const REG_BOLD: FontWeight[] = [
  { label: 'Regular', value: 400 },
  { label: 'Bold', value: 700 },
]
// 단일 굵기(디스플레이) 폰트 — 굵기 조절 불가
const SINGLE: FontWeight[] = [{ label: 'Regular', value: 400 }]

export const FONTS: FontDef[] = [
  { name: 'Pretendard', weights: FULL },
  { name: 'Bangers', weights: SINGLE },
  { name: 'Luckiest Guy', weights: SINGLE },
  { name: 'Anton', weights: SINGLE },
  { name: 'Fredoka', weights: REG_MED_SEMI_BOLD },
  { name: 'Poppins', weights: REG_MED_SEMI_BOLD },
  { name: 'Caveat', weights: REG_BOLD },
  { name: 'Lobster', weights: SINGLE },
  { name: 'Jua', weights: SINGLE },
  { name: 'Do Hyeon', weights: SINGLE },
  { name: 'Black Han Sans', weights: SINGLE },
  { name: 'Gaegu', weights: REG_BOLD },
  { name: 'Nanum Pen Script', weights: SINGLE },
  {
    name: 'Noto Sans JP',
    weights: [
      { label: 'Regular', value: 400 },
      { label: 'Medium', value: 500 },
      { label: 'Bold', value: 700 },
      { label: 'Black', value: 900 },
    ],
  },
]

export const FONT_NAMES = FONTS.map(f => f.name)

/** 폰트가 지원하는 굵기 목록 */
export function fontWeights(name: string): FontWeight[] {
  return FONTS.find(f => f.name === name)?.weights ?? SINGLE
}

/** 현재 굵기를 새 폰트가 지원하는 가장 가까운 값으로 보정 */
export function clampWeight(fontName: string, weight: number): number {
  const values = fontWeights(fontName).map(w => w.value)
  if (values.includes(weight)) return weight
  return values.reduce(
    (best, v) => (Math.abs(v - weight) < Math.abs(best - weight) ? v : best),
    values[0],
  )
}

export const COLORS = ['#191F28', '#FFFFFF', '#22C55E', '#F59E0B', '#EF4444', '#3B82F6']

/** GIF 원본 여부 — 다운로드 형식 제한에 사용 */
export function isGif(file: { name: string; type?: string }) {
  return file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif')
}

const KOREAN_RE = /[가-힣]+/

/**
 * 업로드 파일을 데모 항목과 병합 (파일이 없으면 데모 그대로).
 * OCR 연동 전 데모 감지 규칙: 파일명에 한글이 있으면 그걸 "감지된 텍스트"로,
 * 없으면 감지 실패(korean = '') 처리 — 에디터에서 경고 토스트가 뜬다.
 */
export function toDemoItems(files: UploadFile[]): DemoItem[] {
  if (files.length === 0) return DEMO_ITEMS
  return files.map((f, i) => {
    const detected = f.name.replace(/\.[^.]+$/, '').match(KOREAN_RE)?.[0] ?? ''
    const exact = DEMO_ITEMS.find(d => d.korean === detected)
    const base = exact ?? DEMO_ITEMS[i % DEMO_ITEMS.length]
    return { ...base, ...f, korean: detected }
  })
}

const FONT_BY_CATEGORY: Record<string, string> = {
  bold: 'Anton', comic: 'Bangers', cute: 'Fredoka', handwriting: 'Caveat', minimal: 'Pretendard',
}

/** 실제 결과 API 응답을 기존 에디터가 소비하는 화면 모델로 변환한다. */
/** 텍스트 오버레이 초기 배치용 — OCR 박스 중심을 캔버스(약 300px 스팬) 좌표로 매핑 */
const POSITION_SPAN = 300

function fontForLocalization(localization: { recommendedStyle: unknown } | undefined): string {
  const category = localization?.recommendedStyle && typeof localization.recommendedStyle === 'object' && 'fontCategory' in localization.recommendedStyle
    ? String((localization.recommendedStyle as { fontCategory: unknown }).fontCategory) : 'minimal'
  return FONT_BY_CATEGORY[category] ?? 'Pretendard'
}

export function toEditorItems(assets: ProjectResultAsset[], language: TargetLanguageCode): DemoItem[] {
  return assets
    .filter(asset => asset.status === 'completed' && asset.originalUrl && asset.ocr.primaryRegionId)
    .map(asset => {
      const width = asset.width ?? 0
      const height = asset.height ?? 0
      const regions: EditorRegion[] = asset.ocr.regions
        .map(region => {
          const localization = region.localizations[language]
          const cx = width ? (region.box.x + region.box.width / 2) / width : 0.5
          const cy = height ? (region.box.y + region.box.height / 2) / height : 0.5
          return {
            regionId: region.id,
            korean: region.text ?? '',
            suggestions: localization?.candidates ?? [],
            recommendedFont: fontForLocalization(localization),
            pos: { x: Math.round((cx - 0.5) * POSITION_SPAN), y: Math.round((cy - 0.5) * POSITION_SPAN) },
            size: Math.round(Math.min(56, Math.max(18, height ? (region.box.height / height) * POSITION_SPAN * 0.7 : 28))),
          }
        })
        // 번역 후보가 있는 영역만 편집 대상으로 (실패/빈 영역 제외)
        .filter(region => region.suggestions.length > 0)
      const primaryLocalization = asset.localizations[language]
      return {
        id: asset.id,
        name: asset.name,
        type: asset.type,
        url: asset.cleanedUrl ?? asset.originalUrl ?? undefined,
        cleanedUrl: asset.cleanedUrl ?? undefined,
        originalUrl: asset.originalUrl ?? undefined,
        emoji: '🖼️',
        korean: asset.ocr.fullText ?? '',
        regionId: asset.ocr.primaryRegionId ?? undefined,
        suggestions: primaryLocalization?.candidates ?? regions[0]?.suggestions ?? [],
        recommendedFont: fontForLocalization(primaryLocalization),
        regions,
      }
    })
    // 편집 가능한 영역이 하나도 없는 이미지는 제외
    .filter(item => (item.regions?.length ?? 0) > 0)
}
