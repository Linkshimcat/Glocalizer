import type { ReactNode } from 'react'
import Logo from './Logo'

interface HeaderProps {
  center?: ReactNode
  right?: ReactNode
  sticky?: boolean
}

export default function Header({ center, right, sticky = false }: HeaderProps) {
  return (
    <header
      className={`border-b border-gray-100 ${
        sticky ? 'sticky top-0 z-30 bg-white/70 backdrop-blur-md' : 'bg-white'
      }`}
    >
      <div
        className={`mx-auto grid max-w-[1200px] grid-cols-[1fr_auto_1fr] items-center px-4 md:h-[72px] md:px-6 ${
          center ? 'min-h-[72px] gap-y-2 py-3 md:py-0' : 'h-[72px]'
        }`}
      >
        <div className="col-start-1 row-start-1">
          <Logo />
        </div>
        {center && (
          <div className="col-span-3 row-start-2 justify-self-center md:col-span-1 md:col-start-2 md:row-start-1">
            {center}
          </div>
        )}
        <div className="col-start-3 row-start-1 justify-self-end">{right}</div>
      </div>
    </header>
  )
}
