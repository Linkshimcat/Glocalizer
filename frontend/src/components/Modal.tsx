import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'

interface ModalProps {
  onClose: () => void
  children: ReactNode
  labelledBy?: string
  closeLabel: string
}

export default function Modal({ onClose, children, labelledBy, closeLabel }: ModalProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  // 모달이 떠 있는 동안 배경 페이지 스크롤을 막는다. iOS Safari는 overflow:hidden만으로는
  // 텍스트 입력창 포커스 시 키보드가 뜨면서 배경 페이지를 스크롤시켜버리는 경우가 있어,
  // body를 아예 fixed로 고정해 스크롤 자체가 불가능하게 만든다.
  useEffect(() => {
    const scrollY = window.scrollY
    const { body } = document
    const prevStyle = { position: body.style.position, top: body.style.top, width: body.style.width, overflow: body.style.overflow }
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.width = '100%'
    body.style.overflow = 'hidden'
    return () => {
      body.style.position = prevStyle.position
      body.style.top = prevStyle.top
      body.style.width = prevStyle.width
      body.style.overflow = prevStyle.overflow
      window.scrollTo(0, scrollY)
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* min-h-full + 이 wrapper에서 중앙 정렬해야, 모달이 화면보다 커도 위쪽이 잘리지 않고
          바깥 컨테이너(overflow-y-auto)로 스크롤해서 볼 수 있다. */}
      <div className="flex min-h-full items-center justify-center p-4 py-8">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
          onClick={event => event.stopPropagation()}
          className="relative w-full max-w-md rounded-[28px] bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.2)] sm:p-8"
        >
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="absolute right-5 top-5 rounded-full p-1 text-sub transition-colors hover:bg-surface hover:text-ink"
          >
            <X className="h-5 w-5" />
          </button>
          {children}
        </div>
      </div>
    </div>
  )
}
