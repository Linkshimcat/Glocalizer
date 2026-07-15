import { forwardRef, type ButtonHTMLAttributes } from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-45 active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary: "bg-brand text-white hover:bg-brand-hover shadow-[0_2px_10px_rgba(0,196,113,0.28)] disabled:shadow-none",
        secondary:
          "bg-surface text-text-primary hover:bg-surface-hover",
        outline:
          "border border-border bg-background text-text-primary hover:bg-surface",
        ghost: "text-text-secondary hover:bg-surface hover:text-text-primary",
        danger: "bg-error text-white hover:brightness-95",
      },
      size: {
        lg: "h-14 px-7 text-[17px]",
        md: "h-12 px-5 text-[15px]",
        sm: "h-10 px-4 text-sm",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    )
  },
)
Button.displayName = "Button"
