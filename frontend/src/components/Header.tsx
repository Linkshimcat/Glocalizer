import type { ReactNode } from 'react'
import Logo from './Logo'

export default function Header({ right }: { right?: ReactNode }) {
  return (
    <header className="border-b border-gray-100 bg-white">
      <div className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between px-6">
        <Logo />
        {right}
      </div>
    </header>
  )
}
