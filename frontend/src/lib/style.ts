import { COLORS, FONT_NAMES } from '../data/demo'

/** 에디터 편집 스타일 (undo/redo · 내보내기 단위) */
export interface Style {
  suggestion: number
  /** 직접 입력한 문구 — 비어 있으면 AI 추천 사용 */
  customText: string
  font: string
  size: number
  /** CSS font-weight 값 (예: 400, 800) */
  weight: number
  rotation: number
  color: string
  transparent: boolean
  strokeOn: boolean
  strokeWidth: number
  strokeColor: string
  shadowOn: boolean
  shadowColor: string
  shadowBlur: number
  shadowY: number
  shadowOpacity: number
  /** 캔버스 중앙 기준 텍스트 위치 오프셋 (px, 340px 에디터 기준) */
  x: number
  y: number
  /** 선택된 정렬 프리셋 (null = 자유 위치/미선택). 버튼 하이라이트·토글용 */
  alignH: 'left' | 'center' | 'right' | null
  alignV: 'top' | 'middle' | 'bottom' | null
  /** 원본 이미지 크기 배율 (%, 100 = 캔버스에 꽉 차게) */
  imageScale: number
}

export const DEFAULT_STYLE: Style = {
  suggestion: 0,
  customText: '',
  font: FONT_NAMES[0],
  size: 28,
  weight: 800,
  rotation: 0,
  color: COLORS[0],
  transparent: true,
  strokeOn: false,
  strokeWidth: 2,
  strokeColor: '#FFFFFF',
  shadowOn: false,
  shadowColor: '#000000',
  shadowBlur: 10,
  shadowY: 4,
  shadowOpacity: 35,
  x: 0,
  y: 105,
  alignH: null,
  alignV: 'bottom',
  imageScale: 100,
}

export function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** 스타일 기준으로 실제 표시될 텍스트 계산 */
export function resolveText(
  style: Style,
  suggestions: { text: string }[],
): string {
  return style.customText.trim() || suggestions[style.suggestion]?.text || ''
}
