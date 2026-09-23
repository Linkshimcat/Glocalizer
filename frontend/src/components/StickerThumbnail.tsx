import { CAPTION_ANCHOR_X, CAPTION_ANCHOR_Y, DEFAULT_CAPTION_STYLE, type GenerationImage } from '../lib/generationApi'

/** 저장된 PNG에는 문구가 구워져 있지 않다 — 다운로드할 때 합성한다. 그래서 목록 썸네일만
 *  보면 문구가 빠진 캐릭터만 보인다. 미리보기와 같은 앵커 규칙으로 문구를 얹어, 목록에서도
 *  출시될 모습 그대로 보이게 한다.
 *
 *  캔버스가 740x640이라 정사각 칸에 넣으면 좌표가 어긋난다. 안쪽에 같은 비율의 상자를 두고
 *  그 상자를 기준으로 퍼센트와 cqw를 계산해, 썸네일 크기와 무관하게 비율이 유지된다. */
export default function StickerThumbnail({ image, className = '' }: { image: GenerationImage; className?: string }) {
  const style = image.caption_style ?? DEFAULT_CAPTION_STYLE
  const [vertical, horizontal] = style.anchor.split('-')
  const shift = horizontal === 'center' ? '-50%' : horizontal === 'right' ? '-100%' : '0'
  return (
    <span className={`relative block aspect-[740/640] w-full [container-type:inline-size] ${className}`}>
      <img src={image.url ?? ''} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-contain" />
      {image.caption ? (
        <span
          className="absolute whitespace-nowrap font-black [paint-order:stroke]"
          style={{
            left: `${(CAPTION_ANCHOR_X[horizontal] ?? CAPTION_ANCHOR_X.center) / 740 * 100}%`,
            top: `${(CAPTION_ANCHOR_Y[vertical] ?? CAPTION_ANCHOR_Y.top) / 640 * 100}%`,
            transform: `translate(${shift}, -100%)`,
            fontSize: `${style.size / 740 * 100}cqw`,
            color: style.color,
            WebkitTextStroke: `${style.size / 740 * 100 * 0.15}cqw ${style.stroke}`,
          }}
        >
          {image.caption}
        </span>
      ) : null}
    </span>
  )
}
