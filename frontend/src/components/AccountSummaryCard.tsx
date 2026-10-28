import { accountCopy } from '../i18n/account'
import { useSiteLang } from '../i18n/LanguageContext'
import { getAccountSummary } from '../lib/authApi'
import { AccountCard, CardLoadFailed, CardSkeleton } from './AccountCard'
import { useAccountResource } from './useAccountResource'

/** 지금까지 만든 프로젝트 수와 마지막 작업 시각. */
export default function AccountSummaryCard() {
  const { lang } = useSiteLang()
  const t = accountCopy(lang)
  const { data, failed, reload } = useAccountResource(getAccountSummary)
  const date = new Intl.DateTimeFormat(lang, { dateStyle: 'medium' })

  return (
    <AccountCard title={t.accountSummaryTitle} description={t.accountSummaryDesc}>
      {failed && <CardLoadFailed onRetry={() => void reload()} />}
      {!data && !failed && <CardSkeleton label={t.accountSessionsLoading} rows={1} />}
      {data && (
        <dl className="mt-5 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-control bg-surface px-2 py-4">
            <dd className="text-2xl font-extrabold text-ink">{data.projectCount}</dd>
            <dt className="mt-1 text-xs font-semibold text-sub">{t.accountSummaryProjects}</dt>
          </div>
          <div className="rounded-control bg-surface px-2 py-4">
            <dd className="text-2xl font-extrabold text-ink">{data.completedProjectCount}</dd>
            <dt className="mt-1 text-xs font-semibold text-sub">{t.accountSummaryCompleted}</dt>
          </div>
          <div className="rounded-control bg-surface px-2 py-4">
            <dd className="text-sm font-extrabold leading-8 text-ink">{data.lastActivityAt ? date.format(new Date(data.lastActivityAt)) : t.accountSummaryNone}</dd>
            <dt className="mt-1 text-xs font-semibold text-sub">{t.accountSummaryLastActivity}</dt>
          </div>
        </dl>
      )}
    </AccountCard>
  )
}
