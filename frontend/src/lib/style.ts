import { COLORS, FONTS } from '../data/demo'

/** 에디터 편집 스타일 (undo/redo · 내보내기 단위) */
export interface Style {
  suggestion: number
  /** 직접 입력한 문구 — 비어 있으면 AI 추천 사용 */
  customText: string
  font: string
  size: number
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
}

export const DEFAULT_STYLE: Style = {
  suggestion: 0,
  customText: '',
  font: FONTS[0],
  size: 28,
  weight: 3,
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
