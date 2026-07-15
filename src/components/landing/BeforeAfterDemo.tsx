import { ArrowRight } from "lucide-react"
import { Emoticon } from "@/components/common/Emoticon"

function StickerCard({
  phrase,
  text,
  font,
  color = "#191F28",
}: {
  phrase: string
  text: string
  font: string
  color?: string
}) {
  return (
    <div className="relative flex aspect-square w-full items-center justify-center rounded-3xl bg-surface">
      <div className="relative h-[72%] w-[72%]">
        <Emoticon phrase={phrase} />
        <span
          className="absolute inset-x-0 bottom-1 text-center leading-none"
          style={{
            fontFamily: font,
            color,
            fontSize: "clamp(20px, 5vw, 30px)",
          }}
        >
          {text}
        </span>
      </div>
    </div>
  )
}

export function BeforeAfterDemo() {
  return (
    <div className="relative rounded-[28px] border border-border bg-background p-5 shadow-[0_20px_60px_-30px_rgba(25,31,40,0.35)] sm:p-6">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-4">
        {/* Original */}
        <div className="flex flex-col gap-3">
          <StickerCard phrase="열공" text="열공" font="'Pretendard Variable', sans-serif" />
          <div className="flex flex-col items-center gap-1">
            <span className="text-[13px] font-medium text-text-muted">
              한국어 원본
            </span>
          </div>
        </div>

        {/* Arrow */}
        <div className="flex size-10 items-center justify-center rounded-full bg-brand-soft text-brand">
          <ArrowRight className="size-5" strokeWidth={2.5} />
        </div>

        {/* Localized */}
        <div className="flex flex-col gap-3">
          <div className="relative">
            <StickerCard phrase="열공" text="Locked IN!" font="'Pretendard Variable', sans-serif" />
            <span className="absolute right-3 top-3 rounded-full bg-brand px-2.5 py-1 text-[11px] font-bold text-white">
              EN
            </span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-[13px] font-semibold text-brand">
              현지화 버전
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-brand-soft px-4 py-3">
        <span className="text-[13px] font-medium text-text-primary">
          개성은 그대로, 새로운 시장을 위한 이모티콘.
        </span>
      </div>
    </div>
  )
}
