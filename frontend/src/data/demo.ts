import type { UploadFile } from '../store/uploads'

/** OCR/번역 API 연동 전, 시연용 데모 데이터 */

export interface Suggestion {
  text: string
  tone: string
  best?: boolean
}

export interface DemoItem extends UploadFile {
  emoji: string
  korean: string
  suggestions: Suggestion[]
  /** 원본 이미지 글씨체와 어울리는 AI 추천 폰트 (API 연동 전 데모값) */
  recommendedFont: string
  textRegions?: DemoTextRegion[]
}

export interface DemoTextRegion {
  id: string
  korean: string
  normalizedBox: { x: number; y: number; width: number; height: number } | null
  suggestions: Suggestion[]
  recommendedFont: string
  textColor: { r: number; g: number; b: number } | null
  needsManualCleanup: boolean
  needsManualOcrReview: boolean
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

/**
 * 폰트의 시각적 특성 태그 — 백엔드 font-style-vision.service.ts가 원본 글자 이미지를 분석해
 * 내놓는 스키마와 동일한 축을 쓴다. 원본 분석 결과와 이 태그를 비교해 가장 비슷한 폰트를
 * 고르는 유사도 매칭에 쓰인다(3단계). weight는 폰트가 지원하는 굵기 중 "이 폰트다운" 대표
 * 굵기일 뿐, 실제 적용 굵기는 매칭 후 별도로 fontWeights()에서 가장 가까운 값으로 고른다 —
 * 폰트 굵기 슬라이더가 이미 있어서 굳이 폰트 선택 단계에서까지 굵기로 걸러낼 필요는 없다.
 */
export interface FontStyleTag {
  weight: 'thin' | 'regular' | 'bold' | 'black'
  roundness: 'sharp' | 'neutral' | 'round'
  handwritten: boolean
  formality: 'playful' | 'neutral' | 'formal'
}

export interface FontDef {
  name: string
  /** 이 폰트가 실제로 지원(로드)하는 굵기 목록 */
  weights: FontWeight[]
  /** 유사도 매칭용 시각적 특성. 언어 강제 폰트(Noto Sans JP/SC)는 매칭 대상이 아니라 생략. */
  style?: FontStyleTag
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
// 통통 둥근 디스플레이(이모티콘 친화) — 다양한 굵기 지원
const ROUNDED_BALOO: FontWeight[] = [
  { label: 'Regular', value: 400 },
  { label: 'Medium', value: 500 },
  { label: 'SemiBold', value: 600 },
  { label: 'Bold', value: 700 },
  { label: 'ExtraBold', value: 800 },
]
const REG_MED_BOLD_BLACK: FontWeight[] = [
  { label: 'Regular', value: 400 },
  { label: 'Medium', value: 500 },
  { label: 'Bold', value: 700 },
  { label: 'Black', value: 900 },
]
// 단일 굵기(디스플레이) 폰트 — 굵기 조절 불가
const SINGLE: FontWeight[] = [{ label: 'Regular', value: 400 }]

export const FONTS: FontDef[] = [
  { name: 'Pretendard', weights: FULL, style: { weight: 'regular', roundness: 'neutral', handwritten: false, formality: 'neutral' } },
  { name: 'Baloo 2', weights: ROUNDED_BALOO, style: { weight: 'bold', roundness: 'round', handwritten: false, formality: 'playful' } },
  { name: 'Gothic A1', weights: REG_MED_BOLD_BLACK, style: { weight: 'regular', roundness: 'sharp', handwritten: false, formality: 'neutral' } },
  { name: 'Comic Neue', weights: REG_BOLD, style: { weight: 'regular', roundness: 'round', handwritten: false, formality: 'playful' } },
  { name: 'Bangers', weights: SINGLE, style: { weight: 'black', roundness: 'round', handwritten: false, formality: 'playful' } },
  { name: 'Luckiest Guy', weights: SINGLE, style: { weight: 'black', roundness: 'round', handwritten: false, formality: 'playful' } },
  { name: 'Anton', weights: SINGLE, style: { weight: 'black', roundness: 'sharp', handwritten: false, formality: 'neutral' } },
  { name: 'Fredoka', weights: REG_MED_SEMI_BOLD, style: { weight: 'bold', roundness: 'round', handwritten: false, formality: 'playful' } },
  { name: 'Poppins', weights: REG_MED_SEMI_BOLD, style: { weight: 'regular', roundness: 'neutral', handwritten: false, formality: 'neutral' } },
  { name: 'Caveat', weights: REG_BOLD, style: { weight: 'regular', roundness: 'round', handwritten: true, formality: 'playful' } },
  // Lobster는 필기체 사인펜 스타일에서 파생된 스크립트 서체라 둥근 산세리프(Baloo 2 등)보다는 손글씨 계열에 가깝다
  { name: 'Lobster', weights: SINGLE, style: { weight: 'bold', roundness: 'round', handwritten: true, formality: 'playful' } },
  { name: 'Jua', weights: SINGLE, style: { weight: 'bold', roundness: 'round', handwritten: false, formality: 'playful' } },
  { name: 'Do Hyeon', weights: SINGLE, style: { weight: 'black', roundness: 'neutral', handwritten: false, formality: 'neutral' } },
  { name: 'Black Han Sans', weights: SINGLE, style: { weight: 'black', roundness: 'sharp', handwritten: false, formality: 'neutral' } },
  { name: 'Gaegu', weights: REG_BOLD, style: { weight: 'regular', roundness: 'round', handwritten: true, formality: 'playful' } },
  { name: 'Nanum Pen Script', weights: SINGLE, style: { weight: 'thin', roundness: 'round', handwritten: true, formality: 'playful' } },
  // formality: 'formal' 태그를 가진 폰트가 하나도 없어 격식체 원문은 항상 neutral 폰트로 대체 매칭되던 공백을 메운다
  { name: 'Noto Sans KR', weights: REG_MED_BOLD_BLACK, style: { weight: 'regular', roundness: 'neutral', handwritten: false, formality: 'formal' } },
  {
    name: 'Noto Sans JP',
    weights: [
      { label: 'Regular', value: 400 },
      { label: 'Medium', value: 500 },
      { label: 'Bold', value: 700 },
      { label: 'Black', value: 900 },
    ],
  },
  {
    name: 'Noto Sans SC',
    weights: [
      { label: 'Regular', value: 400 },
      { label: 'Medium', value: 500 },
      { label: 'Bold', value: 700 },
      { label: 'Black', value: 900 },
    ],
  },
]

export const FONT_NAMES = FONTS.map(f => f.name)

const WEIGHT_ORDER: Record<FontStyleTag['weight'], number> = { thin: 0, regular: 1, bold: 2, black: 3 }
const ROUNDNESS_ORDER: Record<FontStyleTag['roundness'], number> = { sharp: 0, neutral: 1, round: 2 }
const FORMALITY_ORDER: Record<FontStyleTag['formality'], number> = { playful: 0, neutral: 1, formal: 2 }

/**
 * 두 스타일 태그 사이의 "다른 정도"를 계산한다. roundness·formality·handwritten은 폰트를 바꾸지
 * 않으면 못 고치는 특성이라 비중을 크게 두고, weight는 폰트 선택 후 별도 굵기 슬라이더로
 * 조절 가능해서 절반만 반영한다.
 */
function styleDistance(a: FontStyleTag, b: FontStyleTag): number {
  const weightDiff = Math.abs(WEIGHT_ORDER[a.weight] - WEIGHT_ORDER[b.weight]) * 0.5
  const roundnessDiff = Math.abs(ROUNDNESS_ORDER[a.roundness] - ROUNDNESS_ORDER[b.roundness])
  const formalityDiff = Math.abs(FORMALITY_ORDER[a.formality] - FORMALITY_ORDER[b.formality])
  const handwrittenDiff = a.handwritten === b.handwritten ? 0 : 1.5
  return weightDiff + roundnessDiff + formalityDiff + handwrittenDiff
}

/** 문자열을 32bit 정수 해시로 변환 — 동점 폰트 중 하나를 asset별로 고르게 분산시키는 데 쓴다 */
function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) hash = (Math.imul(hash, 31) + value.charCodeAt(i)) >>> 0
  return hash
}

/**
 * 원본 글자의 시각적 특성과 가장 비슷한 폰트를 폰트 라이브러리에서 찾는다(최근접 매칭).
 * 4개 범주형 축만으로는 여러 폰트가 정확히 동점(예: Bangers/Luckiest Guy)이 나는 경우가 흔한데,
 * 동점일 때 항상 배열 순서상 앞선 폰트만 고르면 뒤쪽 폰트는 추천에 영원히 뽑히지 못한다.
 * seed(보통 asset id)가 있으면 동점 후보 중 하나를 seed 기반으로 고르게 분산시켜 뽑는다 —
 * 같은 이미지는 항상 같은 폰트로(재현 가능), 다른 이미지끼리는 골고루 갈리도록.
 */
export function pickFontByStyle(original: FontStyleTag, seed?: string): string {
  const candidates = FONTS.filter((font): font is FontDef & { style: FontStyleTag } => Boolean(font.style))
  let bestDistance = Infinity
  let tied: (FontDef & { style: FontStyleTag })[] = []
  for (const candidate of candidates) {
    const distance = styleDistance(original, candidate.style)
    if (distance < bestDistance - 1e-9) {
      bestDistance = distance
      tied = [candidate]
    } else if (Math.abs(distance - bestDistance) < 1e-9) {
      tied.push(candidate)
    }
  }
  if (tied.length === 1 || !seed) return tied[0].name
  return tied[hashString(seed) % tied.length].name
}

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
function demoSuggestions(item: DemoItem, languageCode: string): Suggestion[] {
  if (languageCode === 'ja') return item.suggestions.map((suggestion, index) => ({ ...suggestion, text: index === 0 ? '最高！' : index === 1 ? 'いいね！' : 'すごい！' }))
  if (languageCode === 'zh') return item.suggestions.map((suggestion, index) => ({ ...suggestion, text: index === 0 ? '太棒了！' : index === 1 ? '绝了！' : '好厉害！' }))
  return item.suggestions
}

export function toDemoItems(files: UploadFile[], languageCode = 'en'): DemoItem[] {
  if (files.length === 0) return DEMO_ITEMS.map(item => ({ ...item, suggestions: demoSuggestions(item, languageCode), recommendedFont: languageCode === 'ja' ? 'Noto Sans JP' : languageCode === 'zh' ? 'Noto Sans SC' : item.recommendedFont }))
  return files.map((f, i) => {
    if (f.analysis) {
      const localized = f.analysis.localizations?.[languageCode]
      const textRegions = f.analysis.regions.map(region => {
        const regionLocalization = region.localizations[languageCode]
        return {
          id: region.id,
          korean: region.korean,
          normalizedBox: region.normalizedBox,
          suggestions: regionLocalization?.suggestions ?? [],
          recommendedFont: regionLocalization?.recommendedFont ?? (languageCode === 'ja' ? 'Noto Sans JP' : languageCode === 'zh' ? 'Noto Sans SC' : 'Pretendard'),
          textColor: region.textColor,
          needsManualCleanup: region.needsManualCleanup,
          needsManualOcrReview: region.needsManualOcrReview,
        }
      })
      return {
        ...f,
        // 자동 정리본이 있으면 export/미리보기의 base로, 없으면 원본을 쓴다.
        url: f.analysis.cleanedUrl ?? f.analysis.originalUrl ?? f.url,
        emoji: '🖼️',
        korean: f.analysis.korean,
        suggestions: localized?.suggestions ?? f.analysis.suggestions ?? [],
        recommendedFont: localized?.recommendedFont ?? f.analysis.recommendedFont ?? (languageCode === 'ja' ? 'Noto Sans JP' : languageCode === 'zh' ? 'Noto Sans SC' : 'Pretendard'),
        textRegions,
      }
    }
    const detected = f.name.replace(/\.[^.]+$/, '').match(KOREAN_RE)?.[0] ?? ''
    const exact = DEMO_ITEMS.find(d => d.korean === detected)
    const base = exact ?? DEMO_ITEMS[i % DEMO_ITEMS.length]
    return { ...base, ...f, korean: detected, suggestions: demoSuggestions(base, languageCode) }
  })
}
