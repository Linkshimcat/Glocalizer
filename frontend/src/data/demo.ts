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

export const FONTS = [
  'Pretendard',
  'Bangers',
  'Luckiest Guy',
  'Anton',
  'Fredoka',
  'Poppins',
  'Caveat',
  'Lobster',
  'Jua',
  'Do Hyeon',
  'Black Han Sans',
  'Gaegu',
  'Nanum Pen Script',
  'Noto Sans JP',
]

export const COLORS = ['#191F28', '#FFFFFF', '#22C55E', '#F59E0B', '#EF4444', '#3B82F6']

export const WEIGHTS = [
  { label: 'Thin', value: 200 },
  { label: 'Regular', value: 400 },
  { label: 'Medium', value: 500 },
  { label: 'Bold', value: 800 },
] as const

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
