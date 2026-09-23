import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react'

type ToastType = 'warning' | 'success'

interface ToastItem {
  id: number
  message: string
  type: ToastType
}

const ToastContext = createContext<(message: string, type?: ToastType) => void>(
  () => {},
)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const idRef = useRef(0)

  const toast = useCallback((message: string, type: ToastType = 'warning') => {
    const id = ++idRef.current
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3200)
  }, [])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4">
        {toasts.map(t => (
          <div
            key={t.id}
            role="alert"
            className="animate-toast-in flex w-full max-w-sm items-center gap-3 rounded-2xl border border-gray-200/70 bg-white px-3.5 py-3 shadow-[0_12px_32px_rgba(25,31,40,0.12)]"
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                t.type === 'warning' ? 'bg-amber-50 text-amber-600' : 'bg-brand-soft text-brand-dark'
              }`}
            >
              {t.type === 'warning' ? <AlertTriangle className="h-[18px] w-[18px]" /> : <CheckCircle2 className="h-[18px] w-[18px]" />}
            </span>
            <p className="min-w-0 break-keep text-sm font-bold leading-6 text-ink">{t.message}</p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
