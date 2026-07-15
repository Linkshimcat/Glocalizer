import { CheckCircle2, AlertCircle, X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ToastItem {
  id: number
  title: string
  description?: string
  variant?: "success" | "error"
  duration?: number
}

export function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastItem
  onDismiss: () => void
}) {
  const isError = toast.variant === "error"
  return (
    <div
      className={cn(
        "animate-toast-in pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border bg-background px-4 py-3.5 shadow-[0_8px_30px_rgba(25,31,40,0.12)]",
        isError ? "border-error/30" : "border-border",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full",
          isError ? "bg-error-soft text-error" : "bg-brand-soft text-brand",
        )}
      >
        {isError ? (
          <AlertCircle className="size-4" />
        ) : (
          <CheckCircle2 className="size-4" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-text-primary">{toast.title}</p>
        {toast.description ? (
          <p className="mt-0.5 text-[13px] leading-relaxed text-text-secondary">
            {toast.description}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="알림 닫기"
        className="-mr-1 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface hover:text-text-primary"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}
