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
