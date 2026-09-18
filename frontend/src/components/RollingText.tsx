import { Fragment } from 'react'

/** 어절이 세로로 굴러 올라가면서 들어오고 나가는 텍스트. 진입·퇴장에 모션 블러가 걸린다.
 *
 *  어절을 전부 같은 그리드 셀에 겹쳐 쌓기 때문에 컨테이너 폭이 가장 긴 어절 기준으로
 *  고정된다 — 단어가 바뀌어도 제목이 좌우로 흔들리지 않는다.
 *  타이밍은 index.css의 `roll-word` 키프레임에 있고, 슬롯 길이만 여기서 맞춘다. */

/** 한 어절이 화면에 머무는 시간(초). roll-word 키프레임의 7.2s ÷ 3과 맞아야 한다. */
const SLOT_SECONDS = 2.4

/** per="char"에서 글자 하나씩 늦게 출발하는 간격(초). 왼쪽부터 물결처럼 넘어간다. */
const CHAR_STAGGER_SECONDS = 0.06

/** loop={false}의 글자 간격(초). 짧은 문장은 이 간격 그대로 흐른다. */
const ONCE_STAGGER_SECONDS = 0.03

/** loop={false}에서 첫 글자와 마지막 글자의 출발 차이 상한(초). 긴 문장은 간격을 좁혀
 *  이 안에 맞춘다 — 간격을 고정하면 영어(25자)가 한국어(11자)보다 한참 늦게 끝난다. */
const ONCE_MAX_SPREAD_SECONDS = 0.3

type Props = {
  items: string[]
  className?: string
  /** 'word'면 어절 통째로, 'char'면 어절 안의 글자가 하나씩 굴러간다. */
  per?: 'word' | 'char'
  /** false면 items[0]의 글자가 한 번만 굴러 올라와 멈춘다(per는 무시). */
  loop?: boolean
}

/** 줄바꿈 단위로 자른다. 띄어쓰기가 있으면 공백에서, 없는 일본어·중국어는 Intl.Segmenter의
 *  단어 경계에서 끊는다. 문장부호(？ 、 ?)는 앞 단어에 붙여 줄 첫머리에 혼자 떨어지지 않게 한다.
 *  Segmenter가 없는 브라우저에선 공백으로만 나눈다. */
function toLines(text: string): string[][] {
  const segmenter = typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter(undefined, { granularity: 'word' }) : null
  return text.split(/(\s+)/).map(part => {
    if (/^\s*$/.test(part) || !segmenter) return [part]
    const words: string[] = []
    for (const { segment, isWordLike } of segmenter.segment(part)) {
      if (!isWordLike && words.length > 0) words[words.length - 1] += segment
      else words.push(segment)
    }
    return words
  })
}

/** 한 문장을 글자 단위로 한 번만 굴려 올린다. 제목처럼 줄바꿈되는 긴 문장용.
 *  단어마다 따로 잘라내서(overflow-hidden) 줄이 바뀌어도 각 단어가 제 자리에서 올라오고,
 *  단어 경계에서만 줄이 바뀐다 — 글자 사이에서 끊기지 않는다. */
function RollOnce({ text, className }: { text: string; className: string }) {
  const charCount = [...text.replace(/\s+/g, '')].length
  const stagger = Math.min(ONCE_STAGGER_SECONDS, ONCE_MAX_SPREAD_SECONDS / Math.max(charCount - 1, 1))
  let charIndex = 0
  return (
    <span aria-hidden="true" className={className}>
      {/* 문구가 바뀌면(언어 전환) 통째로 다시 마운트해서 한 번 더 굴린다. */}
      <Fragment key={text}>
        {toLines(text).map((words, partIndex) =>
          /^\s+$/.test(words[0]) ? (
            words[0]
          ) : (
            <Fragment key={partIndex}>
              {words.map((word, wordIndex) => (
                <Fragment key={wordIndex}>
                  {/* 띄어쓰기 없는 문장 안에서 단어 사이에 줄바꿈 지점을 준다. */}
                  {wordIndex > 0 && <wbr />}
                  <span className="-my-[0.12em] inline-block overflow-hidden py-[0.12em] align-top whitespace-nowrap">
                    {[...word].map((char, index) => (
                      <span
                        key={index}
                        className="animate-roll-in inline-block"
                        style={{ animationDelay: `${charIndex++ * stagger}s` }}
                      >
                        {char}
                      </span>
                    ))}
                  </span>
                </Fragment>
              ))}
            </Fragment>
          ),
        )}
      </Fragment>
    </span>
  )
}

export default function RollingText({ items, className = '', per = 'word', loop = true }: Props) {
  if (!loop) return <RollOnce text={items[0] ?? ''} className={className} />

  return (
    // py/-my: 60px 한글은 overflow-hidden에 받침과 윗선이 잘려서 세로 여유를 주고 되돌린다.
    <span
      aria-hidden="true"
      className={`relative inline-grid -my-[0.12em] overflow-hidden py-[0.12em] text-left align-bottom ${className}`}
    >
      {items.map((item, itemIndex) => {
        const delayBase = itemIndex * SLOT_SECONDS

        // 글자 단위여도 어절은 통째로 한 겹에 두고 그 안의 글자만 굴린다.
        // 글자마다 폭을 고정하면 가변폭인 라틴 문자의 자간이 깨진다("in Engl i sh").
        return (
          <span key={item} className="roll-layer [grid-area:1/1] whitespace-pre">
            {per === 'char' ? (
              [...item].map((char, charIndex) => (
                <span
                  key={charIndex}
                  className="animate-roll-word inline-block whitespace-pre"
                  style={{ animationDelay: `${delayBase + charIndex * CHAR_STAGGER_SECONDS}s` }}
                >
                  {char}
                </span>
              ))
            ) : (
              <span className="animate-roll-word inline-block" style={{ animationDelay: `${delayBase}s` }}>
                {item}
              </span>
            )}
          </span>
        )
      })}
    </span>
  )
}
