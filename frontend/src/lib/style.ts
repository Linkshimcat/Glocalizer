import { COLORS, FONT_NAMES } from '../data/demo'

export interface NormalizedRect {
  x: number
  y: number
  width: number
  height: number
}

export interface ManualCleanup {
  mode: 'transparent' | 'solid'
  rect: NormalizedRect
  color?: string
}

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
  /** 그림자 가로 오프셋 (px, 음수=왼쪽) */
  shadowX: number
  /** 그림자 세로 오프셋 (px, 음수=위쪽) */
  shadowY: number
  /** 그림자 불투명도 (%, 100=진함 / 0=투명) — UI에선 '투명도'로 반전 표시 */
  shadowOpacity: number
  /** 캔버스 중앙 기준 텍스트 위치 오프셋 (px, 340px 에디터 기준) */
  x: number
  y: number
  /** 선택된 정렬 프리셋 (null = 자유 위치/미선택). 버튼 하이라이트·토글용 */
  alignH: 'left' | 'center' | 'right' | null
  alignV: 'top' | 'middle' | 'bottom' | null
  /** 원본 이미지 크기 배율 (%, 100 = 캔버스에 꽉 차게) */
  imageScale: number
  /** 원문을 수동으로 가릴 때 쓰는 원본 이미지 기준(0~1) 사각형 */
  manualCleanup?: ManualCleanup
}

/** OCR bbox를 기존 340px 에디터 좌표로 옮긴 기본 텍스트 스타일 */
export function styleFromNormalizedBox(box: NormalizedRect): Style {
  const editorSize = 340
  return {
    ...DEFAULT_STYLE,
    x: Math.round((box.x + box.width / 2 - 0.5) * editorSize),
    y: Math.round((box.y + box.height / 2 - 0.5) * editorSize),
    size: Math.max(12, Math.min(96, Math.round(box.height * editorSize * 0.82))),
    alignH: null,
    alignV: null,
  }
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
  shadowX: 0,
  shadowY: 4,
  shadowOpacity: 50,
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
