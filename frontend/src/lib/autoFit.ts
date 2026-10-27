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
  /** 가로·세로 중 더 크게 넘친 쪽(px, 정수 반올림). fits=true면 0 */
  overflowPx: number
  /** 가로로 넘친 px(0 이상, 정수 반올림) — layoutMetricFor가 축별 비율 계산에 쓴다 */
  widthOverflowPx: number
  /** 세로로 넘친 px(0 이상, 정수 반올림) */
  heightOverflowPx: number
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
    // px는 소수점이 의미 없어 정수로 반올림한다 — 캔버스 측정값(renderedWidth)은 소수점까지
    // 나오지만, QA 쪽에서 비교·저장하기엔 정수면 충분하고 흔들림도 없앤다.
    const widthOverflowPx = Math.max(0, Math.round(renderedWidth - box.widthPx))
    const heightOverflowPx = Math.max(0, Math.round(renderedHeight - box.heightPx))
    const overflowPx = Math.max(widthOverflowPx, heightOverflowPx)
    best = { text: wrapped, fontSizePx: size, fits: overflowPx === 0, overflowPx, widthOverflowPx, heightOverflowPx }
    if (overflowPx === 0) return best
  }
  return best ?? { text: rawText, fontSizePx: minSize, fits: false, overflowPx: 0, widthOverflowPx: 0, heightOverflowPx: 0 }
}

/**
 * QA(/qa/inspect)로 보낼 측정값. 윤재와 합의한 layoutMetrics 포맷과 1:1로 대응한다.
 *
 * ⚠️ 좌표계: overflowPx·fontSizePx는 원본 이미지의 실제 px도, 최종 PNG 출력 px(512 또는
 * OGQ 규격)도 아니고 **에디터 미리보기 기준 340px 정사각 좌표계**(style.ts의
 * EDITOR_PREVIEW_SIZE) 기준이다. 이 값을 다른 좌표계와 비교하려면 scale을 곱해야 한다.
 * outsideCaptionRatio는 비율이라 좌표계 선택과 무관하게 그대로 쓸 수 있다.
 */
export interface LayoutMetric {
  overflowPx: number
  outsideCaptionRatio: number
  fontSizePx: number
}

/**
 * outsideCaptionRatio = 가로 넘침비(widthOverflowPx/box.widthPx)와 세로 넘침비
 * (heightOverflowPx/box.heightPx) 중 더 큰 쪽 — 각 축을 "그 축 자신의" 박스 크기로
 * 나눈다. box.widthPx와 box.heightPx 중 더 큰 값 하나로 두 축을 같이 나누면, 가로로
 * 길고 세로로 짧은 박스에서 세로 넘침이 실제보다 작아 보이는 문제가 있어 축별로 나눴다.
 * 소수 3자리로 반올림한다(0.3 같은 임계값과 비교하기에 충분한 정밀도).
 */
export function layoutMetricFor(result: AutoFitResult, box: AutoFitBox): LayoutMetric {
  const widthRatio = result.widthOverflowPx / Math.max(box.widthPx, 1)
  const heightRatio = result.heightOverflowPx / Math.max(box.heightPx, 1)
  return {
    overflowPx: result.overflowPx,
    outsideCaptionRatio: Math.round(Math.max(widthRatio, heightRatio) * 1000) / 1000,
    fontSizePx: result.fontSizePx,
  }
}
