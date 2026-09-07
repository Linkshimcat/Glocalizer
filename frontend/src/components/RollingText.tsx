/** 어절이 세로로 굴러 올라가면서 들어오고 나가는 텍스트. 진입·퇴장에 모션 블러가 걸린다.
 *
 *  항목을 전부 같은 그리드 셀에 겹쳐 쌓기 때문에 컨테이너 폭이 가장 긴 어절 기준으로
 *  고정된다 — 단어가 바뀌어도 제목이 좌우로 흔들리지 않는다.
 *  타이밍은 index.css의 `roll-word` 키프레임에 있고, 슬롯 길이만 여기서 맞춘다. */

/** 한 어절이 화면에 머무는 시간(초). roll-word 키프레임의 7.2s ÷ 3과 맞아야 한다. */
const SLOT_SECONDS = 2.4

export default function RollingText({
  items,
  className = '',
}: {
  items: string[]
  className?: string
}) {
  return (
    // py/-my: 60px 한글은 overflow-hidden에 받침과 윗선이 잘려서 세로 여유를 주고 되돌린다.
    <span
      aria-hidden="true"
      className={`relative inline-grid -my-[0.12em] overflow-hidden py-[0.12em] text-left align-bottom ${className}`}
    >
      {items.map((item, index) => (
        <span
          key={item}
          className="animate-roll-word [grid-area:1/1] whitespace-nowrap"
          style={{ animationDelay: `${index * SLOT_SECONDS}s` }}
        >
          {item}
        </span>
      ))}
    </span>
  )
}
