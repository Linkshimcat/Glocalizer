import type { Style } from './style'

/** OGQ 다크모드 심사 공지(2024-01-09)의 예시 이미지에서 실측한 어두운 배경색. */
export const DARK_MODE_PREVIEW_COLOR = '#202529'

/** WCAG의 큰 글자·그래픽 대비 기준. OGQ가 수치를 정한 것은 아니다. */
const MIN_CONTRAST = 3
/** 이보다 옅은 글자 배경은 어두운 화면에 묻혀 글자를 받쳐 주지 못한다고 본다. */
const MIN_BACKGROUND_OPACITY = 50

function channelLuminance(hex: string, start: number): number {
  const value = parseInt(hex.slice(start, start + 2), 16) / 255
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}

function luminance(hex: string): number {
  return 0.2126 * channelLuminance(hex, 1) + 0.7152 * channelLuminance(hex, 3) + 0.0722 * channelLuminance(hex, 5)
}

export function contrastRatio(a: string, b: string): number {
  const first = luminance(a)
  const second = luminance(b)
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
}

function visibleOnDark(hex: string): boolean {
  return contrastRatio(hex, DARK_MODE_PREVIEW_COLOR) >= MIN_CONTRAST
}

/**
 * 글자가 어두운 배경에 묻힐 위험이 있는지. 글자가 캐릭터 위에 놓이면 실제로는 잘 보일 수 있어
 * 작가에게 확인을 권하는 안내로만 쓴다. OGQ 심사 결과를 대신 판정하지 않는다.
 * 그림자는 어두운 배경에서 윤곽을 만들어 주지 못하므로 세지 않는다.
 */
export function isTextHardToSeeInDarkMode(style: Pick<Style, 'color' | 'strokeOn' | 'strokeWidth' | 'strokeColor' | 'backgroundOn' | 'backgroundColor' | 'backgroundOpacity'>): boolean {
  if (visibleOnDark(style.color)) return false
  if (style.strokeOn && style.strokeWidth > 0 && visibleOnDark(style.strokeColor)) return false
  if (style.backgroundOn && style.backgroundOpacity >= MIN_BACKGROUND_OPACITY && visibleOnDark(style.backgroundColor)) return false
  return true
}
