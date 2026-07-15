import { cn } from "@/lib/utils"

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex size-8 items-center justify-center overflow-hidden rounded-[10px]",
        className,
      )}
      aria-hidden="true"
    >
      <img src="/site-icon.png" alt="" className="size-full object-cover" />
    </span>
  )
}

export function Logo({
  className,
  wordmark = true,
}: {
  className?: string
  wordmark?: boolean
}) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <LogoMark />
      {wordmark ? (
        <span className="text-[19px] font-bold tracking-tight text-text-primary">
          Glocalizer
        </span>
      ) : null}
    </span>
  )
}
