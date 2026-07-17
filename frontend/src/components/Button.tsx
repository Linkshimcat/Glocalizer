import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  glow?: boolean
}

const variantClass: Record<Variant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-dark',
  secondary: 'bg-surface text-ink hover:bg-[#E8EBEE]',
  ghost: 'bg-transparent text-sub hover:bg-surface',
}

const sizeClass: Record<Size, string> = {
  sm: 'h-9 px-4 text-sm rounded-xl',
  md: 'h-11 px-5 text-[15px] rounded-xl',
  lg: 'h-14 px-8 text-lg rounded-2xl',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  glow = false,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-bold transition-colors disabled:cursor-not-allowed disabled:bg-surface disabled:text-sub ${variantClass[variant]} ${sizeClass[size]} ${
        glow ? 'shadow-[0_12px_32px_rgba(34,197,94,0.4)]' : ''
      } ${className}`}
      {...props}
    />
  )
}
