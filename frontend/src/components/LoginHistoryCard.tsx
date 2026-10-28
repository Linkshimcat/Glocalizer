import { useState } from 'react'
import { accountCopy } from '../i18n/account'
import { useSiteLang } from '../i18n/LanguageContext'
import { getLoginHistory } from '../lib/authApi'
import { AccountCard, CardLoadFailed, CardSkeleton } from './AccountCard'
import { useAccountResource } from './useAccountResource'

const INITIAL_COUNT = 5

/** 폐기·만료된 세션까지 포함한 최근 로그인 기록. 지금 로그인 중인 기기 관리는 위의 로그인된 기기 카드에서 한다. */
export default function LoginHistoryCard() {
  const { lang } = useSiteLang()
  const t = accountCopy(lang)
  const { data, failed, reload } = useAccountResource(getLoginHistory)
  const [expanded, setExpanded] = useState(false)
  const dateTime = new Intl.DateTimeFormat(lang, { dateStyle: 'medium', timeStyle: 'short' })
  const methodLabel = { email: t.accountEmailLogin, naver: t.accountNaverLogin, google: t.accountGoogleLogin, kakao: t.accountKakaoLogin }
  const shown = data && !expanded ? data.slice(0, INITIAL_COUNT) : data

  return (
    <AccountCard title={t.accountLoginHistoryTitle} description={t.accountLoginHistoryDesc}>
      {failed && <CardLoadFailed onRetry={() => void reload()} />}
      {!data && !failed && <CardSkeleton label={t.accountSessionsLoading} />}
      {shown && (shown.length === 0 ? (
        <p className="mt-5 text-sm text-sub">{t.accountLoginHistoryEmpty}</p>
      ) : (
        <ul className="mt-5 divide-y divide-line">
          {shown.map(record => (
            <li key={record.id} className="flex items-center gap-3 py-4">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-bold text-ink">
                  <span className="truncate">{record.deviceLabel ?? t.accountSessionsUnknownDevice}</span>
                  {record.current && <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-bold text-brand-dark">{t.accountSessionsCurrent}</span>}
                </p>
                <p className="mt-0.5 text-xs text-sub">
                  {dateTime.format(new Date(record.createdAt))} · {methodLabel[record.loginMethod]}{record.ipMasked ? ` · ${record.ipMasked}` : ''}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${record.active ? 'bg-brand-soft text-brand-dark' : 'bg-surface text-sub'}`}>
                {record.active ? t.accountLoginHistoryActive : t.accountLoginHistoryEnded}
              </span>
            </li>
          ))}
        </ul>
      ))}
      {data && data.length > INITIAL_COUNT && (
        <button type="button" onClick={() => setExpanded(open => !open)} className="mt-3 text-sm font-bold text-ink hover:underline">
          {expanded ? t.accountLoginHistoryLess : t.accountLoginHistoryMore}
        </button>
      )}
    </AccountCard>
  )
}
