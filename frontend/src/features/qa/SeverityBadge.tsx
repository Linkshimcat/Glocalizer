import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react'
import type { QaCopy } from '../../i18n/qa'
import type { QaSeverity } from '../../types/qa'
import { severityHint, severityLabel } from './qaReport'

const STYLE: Record<QaSeverity, { icon: typeof CheckCircle2; className: string }> = {
  pass: { icon: CheckCircle2, className: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' },
  review: { icon: AlertCircle, className: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200' },
  fail: { icon: XCircle, className: 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200' },
}

/** 색만으로 구분하지 않도록 아이콘과 글자(PASS/REVIEW/FAIL)를 항상 같이 보여준다. */
export default function SeverityBadge({ severity, copy, className = '' }: { severity: QaSeverity; copy: QaCopy; className?: string }) {
  const { icon: Icon, className: tone } = STYLE[severity]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold ${tone} ${className}`} title={severityHint(severity, copy)}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {severityLabel(severity, copy)}
    </span>
  )
}
