import { Check, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export interface LoadingStep {
  id: string
  label: string
}

export type StepStatus = "done" | "active" | "pending"

export function LoadingSteps({
  steps,
  currentIndex,
  failed = false,
}: {
  steps: LoadingStep[]
  currentIndex: number
  failed?: boolean
}) {
  return (
    <ol className="flex flex-col gap-3">
      {steps.map((step, index) => {
        let status: StepStatus = "pending"
        if (index < currentIndex) status = "done"
        else if (index === currentIndex) status = "active"

        const isFailedStep = failed && index === currentIndex

        return (
          <li
            key={step.id}
            className={cn(
              "flex items-center gap-3 rounded-2xl px-4 py-3 transition-colors",
              status === "active" && !failed && "bg-brand-soft",
              isFailedStep && "bg-error-soft",
            )}
          >
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full text-white",
                status === "done" && "bg-brand",
                status === "active" && !failed && "bg-brand",
                status === "pending" && "bg-surface-hover",
                isFailedStep && "bg-error",
              )}
            >
              {status === "done" ? (
                <Check className="size-4" strokeWidth={3} />
              ) : status === "active" && !failed ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <span
                  className={cn(
                    "size-2 rounded-full",
                    status === "pending" ? "bg-text-muted" : "bg-white",
                  )}
                />
              )}
            </span>
            <span
              className={cn(
                "text-[15px]",
                status === "pending"
                  ? "text-text-muted"
                  : "font-medium text-text-primary",
              )}
            >
              {step.label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
