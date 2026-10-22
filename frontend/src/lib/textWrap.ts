/**
 * 번역문이 원문보다 길어져도 글자 크기를 과도하게 줄이는 대신, 박스 너비를 넘기 전에
 * 줄바꿈을 넣어 텍스트가 캐릭터 쪽으로 가로로 삐져나가지 않게 한다. 사용자가 직접 입력한
 * 줄바꿈(\n)은 그대로 존중하고, 그 안에서만 폭을 넘는 줄을 추가로 쪼갠다.
 */
export function wrapTextToWidth(text: string, measureWidth: (line: string) => number, maxWidth: number): string {
  if (!Number.isFinite(maxWidth) || maxWidth <= 0) return text
  return text.split(/\r?\n/).map(paragraph => wrapParagraph(paragraph, measureWidth, maxWidth)).join('\n')
}

function wrapParagraph(paragraph: string, measureWidth: (line: string) => number, maxWidth: number): string {
  if (!paragraph || measureWidth(paragraph) <= maxWidth) return paragraph
  // 공백이 있는 문구(영어 등)는 단어 단위로 접고, 한국어·일본어·중국어처럼 공백이 거의
  // 없는 문구는 글자 단위로 접는다 — CJK 줄바꿈에서는 글자 단위 분리가 표준적이다.
  const words = paragraph.split(' ')
  const useWordBoundary = words.length > 1
  const units = useWordBoundary ? words : Array.from(paragraph)
  const separator = useWordBoundary ? ' ' : ''
  const lines: string[] = []
  let current = ''
  for (const unit of units) {
    const candidate = current ? `${current}${separator}${unit}` : unit
    if (!current || measureWidth(candidate) <= maxWidth) {
      current = candidate
    } else {
      lines.push(current)
      current = unit
    }
  }
  if (current) lines.push(current)
  return lines.join('\n')
}

// 드래그 중 매 프레임마다 측정이 일어날 수 있어, canvas 엘리먼트 하나를 모듈 전역에서
// 재사용한다(폰트 문자열만 바꿔 끼운다 — ctx.font 대입은 가볍다).
let measureCanvasCtx: CanvasRenderingContext2D | null | undefined

export function createCanvasMeasurer(fontSpec: string): (text: string) => number {
  if (measureCanvasCtx === undefined) measureCanvasCtx = document.createElement('canvas').getContext('2d')
  if (measureCanvasCtx) measureCanvasCtx.font = fontSpec
  return (text: string) => measureCanvasCtx?.measureText(text).width ?? 0
}
