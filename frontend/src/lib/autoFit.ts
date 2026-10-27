import { createCanvasMeasurer, wrapTextToWidth } from './textWrap'

// exportImage.ts의 drawMultilineText와 같은 줄 간격 비율을 써야 미리보기·PNG가 같은 줄 수로
// 줄바꿈된다(자동 배치 결과가 다운로드본과 달라 보이면 안 됨).
const LINE_HEIGHT_MULTIPLIER = 1.15
const DEFAULT_MIN_FONT_SIZE_PX = 12
const DEFAULT_MAX_FONT_SIZE_PX = 96
const SIZE_STEP_PX = 1

export interface AutoFitBox {
  widthPx: number
  heightPx: number
}

export interface AutoFitResult {
  /** 선택된 크기에서 wrapTextToWidth까지 적용한 최종 텍스트 */
  text: string
  fontSizePx: number
  /** 최소 크기까지 줄여도 박스에 못 들어가면 false — 이땐 더 줄이지 않고 그대로 보고한다 */
  fits: boolean
  /** 가로·세로 중 더 크게 넘친 쪽(px). fits=true면 0 */
  overflowPx: number
}

export interface AutoFitOptions {
  minFontSizePx?: number
  maxFontSizePx?: number
  /** 주어진 크기(px)에 대한 canvas font 문자열을 만든다 (예: `${weight} ${size}px '${font}', sans-serif`) */
  fontSpecFor: (sizePx: number) => string
}

/**
 * 번역문이 박스 안에 들어올 때까지 글자 크기를 줄이고(기존 wrapTextToWidth로 줄바꿈까지
 * 같이 맞춤), 최소 크기 하한 아래로는 더 줄이지 않는다 — 가독성보다 레이아웃을 우선해
 * 글자를 점처럼 만드는 걸 막기 위함이다. 하한에서도 못 들어가면 fits=false로 보고한다.
 *
 * 매번 최대 크기부터 다시 탐색해 "들어가는 가장 큰 크기"를 찾는다 — 현재 크기에서 줄이는
 * 방식이 아니라, 몇 번을 다시 눌러도 같은 입력엔 같은 결과가 나오게(idempotent) 하기 위함.
 */
export function autoFitText(rawText: string, box: AutoFitBox, options: AutoFitOptions): AutoFitResult {
  const minSize = options.minFontSizePx ?? DEFAULT_MIN_FONT_SIZE_PX
  const maxSize = Math.max(minSize, options.maxFontSizePx ?? DEFAULT_MAX_FONT_SIZE_PX)

  let best: AutoFitResult | null = null
  for (let size = maxSize; size >= minSize; size -= SIZE_STEP_PX) {
    const measure = createCanvasMeasurer(options.fontSpecFor(size))
    const wrapped = wrapTextToWidth(rawText, measure, box.widthPx)
    const lines = wrapped.split('\n')
    const renderedWidth = Math.max(0, ...lines.map(line => measure(line)))
    const renderedHeight = size * LINE_HEIGHT_MULTIPLIER * lines.length
    const overflowPx = Math.max(0, renderedWidth - box.widthPx, renderedHeight - box.heightPx)
    best = { text: wrapped, fontSizePx: size, fits: overflowPx === 0, overflowPx }
    if (overflowPx === 0) return best
  }
  return best ?? { text: rawText, fontSizePx: minSize, fits: false, overflowPx: 0 }
}

/** QA(/qa/inspect)로 보낼 측정값. 윤재와 합의한 layoutMetrics 포맷과 1:1로 대응한다. */
export interface LayoutMetric {
  overflowPx: number
  outsideCaptionRatio: number
  fontSizePx: number
}

export function layoutMetricFor(result: AutoFitResult, box: AutoFitBox): LayoutMetric {
  const referenceSize = Math.max(box.widthPx, box.heightPx, 1)
  return {
    overflowPx: result.overflowPx,
    outsideCaptionRatio: result.overflowPx / referenceSize,
    fontSizePx: result.fontSizePx,
  }
}
