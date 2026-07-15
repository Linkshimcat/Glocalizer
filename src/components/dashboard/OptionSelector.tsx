import { cn } from "@/lib/utils"

interface Option<T extends string> {
  value: T
  label: string
  hint?: string
  badge?: string
  flag?: string
}

interface OptionSelectorProps<T extends string> {
  label: string
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
  layout?: "row" | "col"
  columns?: number
}

export function OptionSelector<T extends string>({
  label,
  options,
  value,
  onChange,
  layout = "col",
  columns,
}: OptionSelectorProps<T>) {
  const isRow = layout === "row"

  return (
    <div>
      <p className="mb-2 text-sm font-bold text-text-primary">{label}</p>
      <div
        role="radiogroup"
        aria-label={label}
        className={cn("gap-3", isRow ? "flex flex-wrap" : "grid")}
        style={
          isRow
            ? undefined
            : {
                gridTemplateColumns: `repeat(${columns ?? options.length}, minmax(0, 1fr))`,
              }
        }
      >
        {options.map((opt) => {
          const active = opt.value === value
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(opt.value)}
              className={cn(
                "inline-flex items-center justify-center gap-3 rounded-2xl border-2 text-[16px] font-bold transition-all",
                isRow ? "h-14 min-w-[142px] px-6" : "w-full flex-col px-3 py-3",
                active
                  ? "border-brand bg-brand-soft text-brand"
                  : "border-transparent bg-surface text-text-primary hover:bg-surface-hover",
              )}
            >
              {opt.badge && (
                <span
                  className={cn(
                    "text-[12px] font-extrabold",
                    active ? "text-brand" : "text-text-muted",
                  )}
                >
                  {opt.badge}
                </span>
              )}
              {opt.flag && (
                <img
                  src={opt.flag}
                  alt=""
                  className="h-[16px] w-6 rounded-[3px] object-cover shadow-sm"
                />
              )}
              <span>{opt.label}</span>
              {opt.hint && (
                <span className="text-xs font-medium text-text-muted">
                  {opt.hint}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
