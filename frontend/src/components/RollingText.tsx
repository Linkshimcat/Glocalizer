/** 어절이 세로로 굴러 올라가면서 들어오고 나가는 텍스트. 진입·퇴장에 모션 블러가 걸린다.
 *
 *  어절을 전부 같은 그리드 셀에 겹쳐 쌓기 때문에 컨테이너 폭이 가장 긴 어절 기준으로
 *  고정된다 — 단어가 바뀌어도 제목이 좌우로 흔들리지 않는다.
 *  타이밍은 index.css의 `roll-word` 키프레임에 있고, 슬롯 길이만 여기서 맞춘다. */

/** 한 어절이 화면에 머무는 시간(초). roll-word 키프레임의 7.2s ÷ 3과 맞아야 한다. */
const SLOT_SECONDS = 2.4

/** per="char"에서 글자 하나씩 늦게 출발하는 간격(초). 왼쪽부터 물결처럼 넘어간다. */
const CHAR_STAGGER_SECONDS = 0.06

type Props = {
  items: string[]
  className?: string
  /** 'word'면 어절 통째로, 'char'면 어절 안의 글자가 하나씩 굴러간다. */
  per?: 'word' | 'char'
}

export default function RollingText({ items, className = '', per = 'word' }: Props) {
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
