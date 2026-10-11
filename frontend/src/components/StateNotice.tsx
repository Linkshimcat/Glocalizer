import { AlertTriangle, Info } from 'lucide-react'
import type { ReactNode } from 'react'

export default function StateNotice({ children, action, error = false, className = '' }: { children: ReactNode; action?: ReactNode; error?: boolean; className?: string }) {
  const Icon = error ? AlertTriangle : Info
  return <div role={error ? 'alert' : 'status'} className={`state-notice ${error ? 'is-error' : ''} ${className}`}>
    <Icon size={18} aria-hidden="true" />
    <div className="min-w-0 flex-1">{children}</div>
    {action}
  </div>
}
