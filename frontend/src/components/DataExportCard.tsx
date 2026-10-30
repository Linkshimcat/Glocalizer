import { Download, Loader2, Mail } from 'lucide-react'
import { accountCopy } from '../i18n/account'
import { useSiteLang } from '../i18n/LanguageContext'
import { useAuth } from '../store/AuthContext'
import { AccountCard } from './AccountCard'
import { maskEmail, useAccountExport } from './useAccountExport'

/** 내 데이터 ZIP 받기: 내 컴퓨터로(완성 이미지 포함) 또는 이메일 링크로(24시간, 완성 이미지 제외). */
export default function DataExportCard() {
  const { user } = useAuth()
  const { lang } = useSiteLang()
  const t = accountCopy(lang)
  const { busy, progressLabel, downloadToComputer, emailing, emailLink } = useAccountExport()
  const email = user?.email ?? null

  return (
    <AccountCard title={t.accountDataTitle} description={t.accountDataDesc}>
      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" onClick={() => void downloadToComputer()} disabled={busy} className="flex items-center gap-1.5 rounded-control bg-action px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {t.accountDataLocal}
        </button>
        <button type="button" onClick={() => void emailLink()} disabled={!email || emailing} className="flex items-center gap-1.5 rounded-control border border-gray-200 px-4 py-2.5 text-sm font-bold text-ink transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50">
          {emailing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          {t.accountDataEmail}
        </button>
      </div>
      <p className="mt-3 text-xs text-sub" role={busy ? 'status' : undefined} aria-live="polite">
        {progressLabel ?? (email ? t.accountDataEmailHint.replace('{email}', maskEmail(email)) : t.accountDataNoEmail)}
      </p>
    </AccountCard>
  )
}
