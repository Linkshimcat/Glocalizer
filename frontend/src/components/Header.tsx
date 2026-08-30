import { useEffect, useState, type ReactNode } from 'react'
import Logo from './Logo'

interface HeaderProps {
  center?: ReactNode
  right?: ReactNode
  sticky?: boolean
  /** PC에서만 배경·테두리를 지워 히어로 그라데이션 위에 겹쳐 놓는다(모바일은 흰 헤더 유지). */
  overlay?: boolean
}

export default function Header({ center, right, sticky = false, overlay = false }: HeaderProps) {
  // 스크롤을 내렸을 때만 블러 배경이 떠오르도록 스크롤 위치를 추적한다.
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    if (!sticky) return
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [sticky])

  return (
    <header
      className={`border-b transition-colors duration-300 ${sticky ? 'sticky top-0 z-30' : ''} ${
        sticky && scrolled
          ? 'border-gray-100 bg-white/70 backdrop-blur-md'
          : overlay
            ? 'border-gray-100 bg-white lg:border-transparent lg:bg-transparent'
            : 'border-gray-100 bg-white'
      }`}
    >
      <div
        className={`mx-auto grid max-w-[1400px] grid-cols-[1fr_auto_1fr] items-center px-4 md:h-[72px] md:px-10 ${
          // 오버레이 헤더는 히어로 카드 안에 있으므로 카드 폭을 꽉 채운다.
          overlay ? 'lg:max-w-none lg:px-7' : ''
        } ${center ? 'min-h-[72px] gap-y-2 py-3 md:py-0' : 'h-[72px]'}`}
      >
        <div className="col-start-1 row-start-1">
          <Logo />
        </div>
        {center && (
          // 우측 슬롯이 없으면 데스크톱에서 메뉴를 오른쪽 끝으로 붙인다(랜딩 기준 레이아웃).
          <div
            className={`col-span-3 row-start-2 justify-self-center md:row-start-1 ${
              right
                ? 'md:col-span-1 md:col-start-2'
                : 'md:col-span-2 md:col-start-2 md:justify-self-end'
            }`}
          >
            {center}
          </div>
        )}
        <div className="col-start-3 row-start-1 justify-self-end">{right}</div>
      </div>
    </header>
  )
}
