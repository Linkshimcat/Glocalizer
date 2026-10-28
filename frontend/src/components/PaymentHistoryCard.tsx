import { accountCopy } from '../i18n/account'
import { useSiteLang } from '../i18n/LanguageContext'
import { getPayments, type PaymentRecord } from '../lib/authApi'
import { AccountCard, CardLoadFailed, CardSkeleton } from './AccountCard'
import { useAccountResource } from './useAccountResource'

const STATUS_STYLE: Record<PaymentRecord['status'], string> = {
  done: 'bg-brand-soft text-brand-dark',
  processing: 'bg-surface text-sub',
  failed: 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400',
  canceled: 'bg-surface text-sub',
}

/** 최근 결제 내역. 결제 키·승인 원문은 서버가 내려주지 않는다. */
export default function PaymentHistoryCard() {
  const { lang } = useSiteLang()
  const t = accountCopy(lang)
  const { data, failed, reload } = useAccountResource(getPayments)
  const date = new Intl.DateTimeFormat(lang, { dateStyle: 'medium' })
  const won = new Intl.NumberFormat(lang, { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 })
  const statusLabel: Record<PaymentRecord['status'], string> = {
    done: t.accountPaymentDone,
    processing: t.accountPaymentProcessing,
    failed: t.accountPaymentFailed,
    canceled: t.accountPaymentCanceled,
  }

  return (
    <AccountCard title={t.accountPaymentsTitle} description={t.accountPaymentsDesc}>
      {failed && <CardLoadFailed onRetry={() => void reload()} />}
      {!data && !failed && <CardSkeleton label={t.accountSessionsLoading} />}
      {data && (data.length === 0 ? (
        <p className="mt-5 text-sm text-sub">{t.accountPaymentsEmpty}</p>
      ) : (
        <ul className="mt-5 divide-y divide-line">
          {data.map(payment => (
            <li key={payment.orderId} className="flex items-center gap-3 py-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-ink">{payment.planName}</p>
                <p className="mt-0.5 text-xs text-sub">{date.format(new Date(payment.approvedAt ?? payment.createdAt))}{payment.method ? ` · ${payment.method}` : ''}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-bold text-ink">{won.format(payment.amount)}</p>
                <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_STYLE[payment.status]}`}>{statusLabel[payment.status]}</span>
              </div>
            </li>
          ))}
        </ul>
      ))}
      <p className="mt-4 text-xs text-sub">{t.accountPaymentsTestNote}</p>
    </AccountCard>
  )
}
