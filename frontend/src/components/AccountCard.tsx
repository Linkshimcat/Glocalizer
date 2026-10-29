import type { ReactNode, Ref } from 'react'
import { accountCopy } from '../i18n/account'
import { useSiteLang } from '../i18n/LanguageContext'

const ACCOUNT_CARD_CLASS = 'mt-6 max-w-2xl rounded-panel border border-gray-200/70 bg-white p-6 sm:p-8'

/** 설정 페이지의 카드 껍데기. 제목·설명과, 불러오는 중·실패 상태를 같은 모양으로 보여 준다. */
export function AccountCard({ title, description, children, sectionRef }: { title: string; description?: string; children: ReactNode; sectionRef?: Ref<HTMLElement> }) {
  return (
    <section ref={sectionRef} className={ACCOUNT_CARD_CLASS} aria-label={title}>
      <h2 className="text-lg font-extrabold text-ink">{title}</h2>
      {description && <p className="mt-1 text-sm text-sub">{description}</p>}
      {children}
    </section>
  )
}

export function CardSkeleton({ label, rows = 2 }: { label: string; rows?: number }) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className="mt-5 animate-pulse space-y-3">
      {Array.from({ length: rows }, (_, index) => <span key={index} className="block h-12 rounded-control bg-surface" />)}
    </div>
  )
}

export function CardLoadFailed({ onRetry }: { onRetry: () => void }) {
  const { lang } = useSiteLang()
  const t = accountCopy(lang)
  return (
    <div role="alert" className="mt-5 flex flex-wrap items-center gap-3 text-sm text-sub">
      <span>{t.accountLoadFailed}</span>
      <button type="button" onClick={onRetry} className="rounded-control border border-gray-200 px-4 py-2 text-sm font-bold text-ink transition-colors hover:bg-surface">{t.accountSessionsRetry}</button>
    </div>
  )
}
