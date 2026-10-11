import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'naver' | 'outline'
type Size = 'xs' | 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  glow?: boolean
}

const variantClass: Record<Variant, string> = {
  primary: 'bg-action text-white hover:bg-[#116b33]',
  secondary: 'bg-surface text-ink hover:bg-[#E8EBEE]',
  ghost: 'bg-transparent text-sub hover:bg-surface',
  naver: 'bg-[#03a94d] text-white hover:bg-[#028a40]',
  outline: 'border border-gray-200 bg-white text-ink hover:bg-surface',
}

const sizeClass: Record<Size, string> = {
  xs: 'min-h-11 px-2 py-2 text-sm rounded-control',
  sm: 'min-h-11 px-4 py-2 text-sm rounded-control',
  md: 'min-h-11 px-5 py-2.5 text-[15px] rounded-control',
  lg: 'min-h-14 px-7 py-3 text-base rounded-control',
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
      className={`inline-flex items-center justify-center gap-2 studio-button text-center leading-snug font-bold transition-colors disabled:cursor-not-allowed disabled:bg-surface disabled:text-sub ${variantClass[variant]} ${sizeClass[size]} ${
        glow ? 'shadow-sm' : ''
      } ${className}`}
      {...props}
    />
  )
}
