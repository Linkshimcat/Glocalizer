import type { QaCopy } from '../../i18n/qa'
import type { QaHistoryEntry } from '../../types/qa'

/** 재검사 이력 — 최신이 위. 직전 검사 대비 FAIL 개수 증감을 같이 보여준다. */
export default function QaHistory({ history, copy, locale }: { history: QaHistoryEntry[]; copy: QaCopy; locale: string }) {
  if (history.length === 0) return null
  const sorted = [...history].sort((a, b) => b.inspectedAt.localeCompare(a.inspectedAt))
  const formatter = new Intl.DateTimeFormat(locale, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <section aria-labelledby="qa-history-title" className="rounded-panel border border-gray-100 bg-white p-5">
      <h2 id="qa-history-title" className="text-sm font-extrabold text-ink">{copy.qaHistoryTitle}</h2>
      <ol className="mt-3 flex flex-col divide-y divide-gray-100">
        {sorted.map((entry, index) => {
          const previous = sorted[index + 1]
          const delta = previous ? entry.fail - previous.fail : null
          return (
            <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs">
              <time dateTime={entry.inspectedAt} className="font-medium text-sub">{formatter.format(new Date(entry.inspectedAt))}</time>
              <span className="flex items-center gap-3 font-bold">
                <span className="text-emerald-700 dark:text-emerald-300">PASS {entry.pass}</span>
                <span className="text-amber-700 dark:text-amber-300">REVIEW {entry.review}</span>
                <span className="text-red-700 dark:text-red-300">FAIL {entry.fail}</span>
                {delta !== null && delta !== 0 && (
                  <span className={delta < 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'} title={copy.qaHistoryDelta}>
                    {delta > 0 ? `+${delta}` : delta}
                  </span>
                )}
              </span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
