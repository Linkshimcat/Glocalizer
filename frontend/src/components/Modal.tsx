import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  onClose: () => void
  children: ReactNode
  labelledBy?: string
  closeLabel: string
  className?: string
}

export default function Modal({ onClose, children, labelledBy, closeLabel, className = 'max-w-md' }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null
    if (!dialogRef.current?.contains(document.activeElement)) dialogRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onCloseRef.current() }
      if (event.key === 'Tab') {
        const targets = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]') ?? []).filter(node => node.getClientRects().length > 0)
        const first = targets[0], last = targets.at(-1)
        if (!first) { event.preventDefault(); dialogRef.current?.focus() }
        else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { event.preventDefault(); last?.focus() }
        else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialogRef.current)) { event.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('keydown', onKeyDown); previousFocus?.focus() }
  }, [])

  // 모달이 떠 있는 동안 배경 페이지 스크롤을 막는다. iOS Safari는 overflow:hidden만으로는
  // 텍스트 입력창 포커스 시 키보드가 뜨면서 배경 페이지를 스크롤시켜버리는 경우가 있어,
  // body를 아예 fixed로 고정해 스크롤 자체가 불가능하게 만든다.
  useEffect(() => {
    const scrollY = window.scrollY
    const { body } = document
    const prevStyle = { position: body.style.position, top: body.style.top, width: body.style.width, overflow: body.style.overflow }
    const root = document.documentElement
    const prevRootBackground = root.style.backgroundColor
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.width = '100%'
    body.style.overflow = 'hidden'
    // bg-black/40을 앱 배경 위에 얹은 색. 오버레이가 닿지 못한 띠도 딤처럼 보인다.
    // 라이트는 #fafbfc, 다크는 --ui-page(#121417) 기준으로 각각 계산.
    root.style.backgroundColor = root.classList.contains('dark') ? '#2b2d2f' : '#969797'
    return () => {
      body.style.position = prevStyle.position
      body.style.top = prevStyle.top
      body.style.width = prevStyle.width
      body.style.overflow = prevStyle.overflow
      root.style.backgroundColor = prevRootBackground
      window.scrollTo(0, scrollY)
    }
  }, [])

  // 조상에 transform·filter가 걸려 있으면 position:fixed의 기준이 뷰포트가 아니라 그 조상이
  // 된다. iOS에서 오버레이가 화면 아래를 덮지 못해 흰 canvas가 드러나던 원인이라, body로
  // 포털해 조상 영향을 끊는다.
  return createPortal(
    <div
      className="fixed inset-0 z-[70] min-h-[100dvh] overflow-y-auto bg-black/40"
      onClick={onClose}
    >
      {/* min-h-full + 이 wrapper에서 중앙 정렬해야, 모달이 화면보다 커도 위쪽이 잘리지 않고
          바깥 컨테이너(overflow-y-auto)로 스크롤해서 볼 수 있다. */}
      <div className="flex min-h-full items-center justify-center p-4 py-8">
        <div
          ref={dialogRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
          onClick={event => event.stopPropagation()}
          className={`relative w-full min-w-0 rounded-dialog border border-line bg-card p-6 shadow-lg sm:p-8 ${className}`}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-control text-sub transition-colors hover:bg-surface hover:text-ink"
          >
            <X className="h-5 w-5" />
          </button>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}
