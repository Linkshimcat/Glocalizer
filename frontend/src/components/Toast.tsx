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
      <div className="pointer-events-none fixed inset-x-0 top-5 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map(t => (
          <div
            key={t.id}
            role="alert"
            className="animate-toast-in flex items-center gap-2.5 rounded-2xl bg-ink px-5 py-3.5 text-sm font-bold text-white shadow-[0_12px_32px_rgba(0,0,0,0.25)]"
          >
            {t.type === 'warning' ? (
              <AlertTriangle className="h-4 w-4 shrink-0 text-[#FACC15]" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-brand" />
            )}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
