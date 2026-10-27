import { COLORS, FONT_NAMES } from '../data/demo'
import type { LayoutMetric } from './autoFit'

export interface NormalizedRect {
  x: number
  y: number
  width: number
  height: number
}

export interface ManualCleanup {
  mode: 'transparent' | 'solid'
  /** 'rect'(기존 사각형) | 'brush'(자유롭게 칠해서 지우기). 없으면 'rect'로 취급(구버전 호환). */
  shape?: 'rect' | 'brush'
  rect: NormalizedRect
  color?: string
  /** 지울 영역의 짧은 변 대비 모서리 둥글기 (0~0.5) */
  radius?: number
  /** shape='brush' 전용: 지운 자국을 그린 정사각형 PNG data URL (흰색 불투명=지움, 투명=유지) */
  brushMask?: string
  /** shape='brush' 전용: 브러시 굵기, 이미지 프레임 폭 대비 % (1~100) */
  brushSize?: number
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
  /** 번역 글자 뒤에 깔리는 배경 패널 */
  backgroundOn: boolean
  backgroundColor: string
  backgroundOpacity: number
  backgroundPadding: number
  backgroundRadius: number
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
  /** autoFit.ts가 계산한 넘침 측정값. QA(/qa/inspect)가 재검사 판정에 쓸 수 있도록 editor
   *  state 저장 시 함께 보낸다(윤재와 합의한 layoutMetrics 포맷, 10/27). */
  layoutMetrics?: LayoutMetric
}

/** 대표 영역은 기존 파일 키를 유지하고, 추가 영역만 합성 키를 써 세션 데이터와 호환한다. */
export function styleKeyForRegion(fileId: string, regionId?: string | null, primaryRegionId?: string | null): string {
  return !regionId || regionId === primaryRegionId ? fileId : `${fileId}::${regionId}`
}

/** 에디터 미리보기가 기준으로 쓰는 정사각 좌표계 크기(px). normalizedBox(0~1)를 이 값에
 * 곱하면 에디터 캔버스 기준 px가 된다 — styleFromNormalizedBox와 겹침 경고 계산이 공유한다. */
export const EDITOR_PREVIEW_SIZE = 340

/** OCR bbox를 기존 340px 에디터 좌표로 옮긴 기본 텍스트 스타일 */
export function styleFromNormalizedBox(box: NormalizedRect, textColor?: { r: number; g: number; b: number } | null, text?: string): Style {
  const editorSize = EDITOR_PREVIEW_SIZE
  const lines = text?.trim().split(/\r?\n/) ?? []
  const lineCount = Math.max(1, lines.length)
  const heightSize = (box.height * editorSize * 0.82) / lineCount
  let size = heightSize
  const longestLine = lines.reduce((longest, line) => Math.max(longest, line.trim().length), 0)
  if (longestLine > 0) {
    // 번역 문구가 box 너비를 넘어 잘리지 않도록 폭 기준으로도 제한한다.
    // 문자폭 ≈ 0.6 * fontSize로 추정하고, 좌우 여백을 위해 0.95를 곱한다.
    const widthSize = (box.width * editorSize * 0.95) / (longestLine * 0.6)
    size = Math.min(heightSize, widthSize)
  }
  return {
    ...DEFAULT_STYLE,
    // 원본에서 감지한 글자색이 있으면 번역 텍스트 기본 색으로 사용한다.
    ...(textColor ? { color: rgbToHex(textColor.r, textColor.g, textColor.b) } : {}),
    x: Math.round((box.x + box.width / 2 - 0.5) * editorSize),
    y: Math.round((box.y + box.height / 2 - 0.5) * editorSize),
    size: Math.max(12, Math.min(96, Math.round(size))),
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
  backgroundOn: false,
  backgroundColor: '#FFFFFF',
  backgroundOpacity: 85,
  backgroundPadding: 6,
  backgroundRadius: 8,
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

const OVERFLOW_TOLERANCE = 0.3

/**
 * 진짜 캐릭터 윤곽 데이터가 없어서(백엔드 클린업 파이프라인은 OCR 박스 주변 작은 영역에서만
 * 임시로 캐릭터 덩어리를 판별하고 바로 버림 — 전체 이미지 기준으로 저장되지 않음), 번역 전
 * 원본 캡션이 있던 자리(normalizedBox)를 "캐릭터와 겹치지 않는 안전 영역"의 근사치로 쓴다.
 * 번역 텍스트 블록이 그 자리에서 원래 박스 크기의 30% 이상 벗어나면 경고 대상으로 본다 —
 * 드래그로 멀리 옮기거나, 크게 리사이즈하거나, 번역문이 길어서 줄바꿈된 경우 모두 해당된다.
 */
export function isTextOverflowingOriginalArea(
  stylePosition: { x: number; y: number },
  renderedSize: { width: number; height: number },
  box: NormalizedRect,
): boolean {
  const boxWidthPx = box.width * EDITOR_PREVIEW_SIZE
  const boxHeightPx = box.height * EDITOR_PREVIEW_SIZE
  const boxCenterX = (box.x + box.width / 2 - 0.5) * EDITOR_PREVIEW_SIZE
  const boxCenterY = (box.y + box.height / 2 - 0.5) * EDITOR_PREVIEW_SIZE
  const marginX = boxWidthPx * OVERFLOW_TOLERANCE
  const marginY = boxHeightPx * OVERFLOW_TOLERANCE
  const textLeft = stylePosition.x - renderedSize.width / 2
  const textRight = stylePosition.x + renderedSize.width / 2
  const textTop = stylePosition.y - renderedSize.height / 2
  const textBottom = stylePosition.y + renderedSize.height / 2
  return (
    textLeft < boxCenterX - boxWidthPx / 2 - marginX
    || textRight > boxCenterX + boxWidthPx / 2 + marginX
    || textTop < boxCenterY - boxHeightPx / 2 - marginY
    || textBottom > boxCenterY + boxHeightPx / 2 + marginY
  )
}

export function rgbToHex(r: number, g: number, b: number): string {
  const channel = (value: number) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')
  return `#${channel(r)}${channel(g)}${channel(b)}`
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
