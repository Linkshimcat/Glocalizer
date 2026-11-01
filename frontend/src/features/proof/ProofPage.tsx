import { Download, Loader2 } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import Button from '../../components/Button'
import Footer from '../../components/Footer'
import StateNotice from '../../components/StateNotice'
import { useToast } from '../../components/Toast'
import { useSiteLang } from '../../i18n/LanguageContext'
import { proofCopy, type ProofCopy } from '../../i18n/proof'
import { RequestError, requestErrorMessage } from '../../lib/requestError'
import type { AnalyticsEventName, ExperimentGroup, ProofSummary } from '../../types/analytics'
import { MOCK_PROOF_SUMMARY } from './mockProof'
import { fetchProofCsv, fetchProofSummary } from './proofApi'

const GROUPS: ExperimentGroup[] = ['external', 'internal', 'demo']
const KEY_STORAGE = 'glocalizer:proofAdminKey'
const DURATION_ROWS: AnalyticsEventName[] = ['localization_completed', 'export_succeeded', 'export_failed']
const COUNT_ROWS: AnalyticsEventName[] = ['demo_started', 'localization_started', 'localization_completed', 'qa_reviewed', 'export_succeeded', 'export_failed']

function groupLabel(group: ExperimentGroup, copy: ProofCopy) {
  return group === 'external' ? copy.proofGroupExternal : group === 'internal' ? copy.proofGroupInternal : copy.proofGroupDemo
}

function eventLabel(name: AnalyticsEventName, copy: ProofCopy) {
  switch (name) {
    case 'demo_started': return copy.proofEvDemoStarted
    case 'localization_started': return copy.proofEvLocStarted
    case 'localization_completed': return copy.proofEvLocCompleted
    case 'qa_reviewed': return copy.proofEvQaReviewed
    case 'export_succeeded': return copy.proofEvExportOk
    case 'export_failed': return copy.proofEvExportFail
  }
}

function durationLabel(name: AnalyticsEventName, copy: ProofCopy) {
  return name === 'localization_completed' ? copy.proofDurLocalized : name === 'export_succeeded' ? copy.proofDurExport : copy.proofDurExportFailed
}

function storedKey(): string {
  try { return sessionStorage.getItem(KEY_STORAGE) ?? '' } catch { return '' }
}

/** FEAT-07 Proof — 서버 이벤트에서 계산한 완주율·처리 시간. 개발 서버에서는 /proof?mock=1로 목업을 볼 수 있다. */
export default function ProofPage() {
  const { lang } = useSiteLang()
  const copy = proofCopy(lang)
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const mock = import.meta.env.DEV && searchParams.get('mock') === '1'
  const [group, setGroup] = useState<ExperimentGroup>('external')
  const [adminKey, setAdminKey] = useState(storedKey)
  const [keyInput, setKeyInput] = useState('')
  const [summary, setSummary] = useState<ProofSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const needsKey = !mock && !adminKey

  const load = useCallback(async () => {
    if (mock) { setSummary({ ...MOCK_PROOF_SUMMARY, experimentGroup: group }); return }
    if (!adminKey) return
    setLoading(true)
    setLoadError(null)
    try {
      setSummary(await fetchProofSummary(group, adminKey))
    } catch (error) {
      // 키가 틀리면 저장된 키를 지워 다시 입력하게 한다.
      if (error instanceof RequestError && (error.status === 401 || error.status === 403 || error.code === 'INVALID_STATS_KEY')) {
        try { sessionStorage.removeItem(KEY_STORAGE) } catch { /* 저장소를 못 쓰는 환경 — 무시 */ }
        setAdminKey('')
        setSummary(null)
        setLoadError(copy.proofKeyRequired)
      } else {
        setLoadError(requestErrorMessage(error, lang, copy.proofLoadFailed))
      }
    } finally {
      setLoading(false)
    }
  }, [mock, group, adminKey, lang, copy.proofKeyRequired, copy.proofLoadFailed])

  useEffect(() => { void load() }, [load])

  const submitKey = (event: FormEvent) => {
    event.preventDefault()
    const value = keyInput.trim()
    if (!value) return
    try { sessionStorage.setItem(KEY_STORAGE, value) } catch { /* 저장소를 못 쓰면 이번 화면에서만 유지 */ }
    setKeyInput('')
    setLoadError(null)
    setAdminKey(value)
  }

  const downloadCsv = async () => {
    if (downloading || mock || !adminKey) return
    setDownloading(true)
    try {
      const blob = await fetchProofCsv(group, adminKey)
      // lib/exportImage의 downloadBlob을 쓰면 내보내기 완주 이벤트로 잘못 세어지므로 직접 내려받는다.
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `glocalizer-events-${group}.csv`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (error) {
      toast(requestErrorMessage(error, lang, copy.proofCsvFailed), 'warning')
    } finally {
      setDownloading(false)
    }
  }

  const number = new Intl.NumberFormat(lang)
  const percent = new Intl.NumberFormat(lang, { style: 'percent', maximumFractionDigits: 1 })
  const date = new Intl.DateTimeFormat(lang, { dateStyle: 'medium' })
  const duration = (ms: number | undefined) => {
    if (ms === undefined) return copy.proofNotMeasured
    if (ms < 1000) return `${number.format(Math.round(ms))} ms`
    return `${new Intl.NumberFormat(lang, { maximumFractionDigits: 1 }).format(ms / 1000)} s`
  }
  const totalEvents = summary ? COUNT_ROWS.reduce((sum, name) => sum + summary.eventCounts[name], 0) : 0
  const period = summary?.period ? `${date.format(new Date(summary.period.from))} – ${date.format(new Date(summary.period.to))}` : copy.proofNotMeasured

  return (
    <div className="flex min-h-svh flex-col">
      <main id="main-content" tabIndex={-1} className="layout-app flex-1 py-10">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{copy.proofPageTitle}</h1>
        <p className="mt-2 max-w-2xl font-medium text-sub">{copy.proofPageDesc}</p>
        {mock && <StateNotice className="mt-6">{copy.proofMockBanner}</StateNotice>}

        {needsKey && (
          <form onSubmit={submitKey} className="mt-8 max-w-xl rounded-panel border border-gray-100 bg-white p-6">
            <label htmlFor="proof-admin-key" className="text-sm font-extrabold text-ink">{copy.proofKeyTitle}</label>
            <p className="mt-1 text-xs text-sub">{copy.proofKeyDesc}</p>
            <div className="mt-3 flex gap-2">
              <input id="proof-admin-key" type="password" autoComplete="off" value={keyInput} onChange={event => setKeyInput(event.target.value)} placeholder={copy.proofKeyPlaceholder} className="ui-input min-w-0 flex-1" />
              <Button type="submit" disabled={!keyInput.trim()}>{copy.proofKeySubmit}</Button>
            </div>
            {loadError && <p role="alert" className="mt-3 text-sm font-bold text-red-700 dark:text-red-300">{loadError}</p>}
          </form>
        )}

        {!needsKey && (
          <>
            <fieldset className="mt-8">
              <legend className="text-sm font-extrabold text-ink">{copy.proofGroups}</legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {GROUPS.map(value => (
                  <label key={value} className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-gray-200 px-4 text-sm font-bold text-sub has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:checked]:text-ink">
                    <input type="radio" name="proof-group" checked={group === value} onChange={() => setGroup(value)} className="h-4 w-4 accent-[var(--color-brand)]" />
                    {groupLabel(value, copy)}
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-sub">{copy.proofGroupsHint}</p>
            </fieldset>

            {loading && <p role="status" className="mt-8 flex items-center gap-2 text-sm text-sub"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />{copy.proofLoading}</p>}
            {loadError && <StateNotice error className="mt-8" action={<Button variant="secondary" onClick={() => void load()}>{copy.proofRetry}</Button>}>{loadError}</StateNotice>}

            {!loading && !loadError && summary && (
              <>
                {summary.experimentGroup !== 'external' && <StateNotice className="mt-6">{copy.proofNotExternal} ({groupLabel(summary.experimentGroup, copy)})</StateNotice>}
                {totalEvents === 0 && <StateNotice className="mt-6">{copy.proofEmpty}</StateNotice>}

                <section aria-label={copy.proofCompletionRate} className="mt-8 grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
                  <div className="rounded-panel border border-gray-100 bg-white p-6">
                    <p className="text-sm font-bold text-sub">{copy.proofCompletionRate}</p>
                    <p className="mt-2 text-5xl font-extrabold tracking-tight text-ink">{summary.completion.rate === null ? copy.proofNotMeasured : percent.format(summary.completion.rate)}</p>
                    <p className="mt-2 text-sm font-bold text-ink">
                      {copy.proofCompletionCount.replace('{started}', number.format(summary.completion.startedProjects)).replace('{exported}', number.format(summary.completion.exportedProjects))}
                    </p>
                    <p className="mt-2 text-xs text-sub">{copy.proofCompletionDef}</p>
                  </div>
                  <div className="rounded-panel border border-gray-100 bg-white p-6">
                    <p className="text-sm font-bold text-sub">{copy.proofSampleSize}</p>
                    <p className="mt-2 text-3xl font-extrabold text-ink">{number.format(summary.sampleSize)} <span className="text-base font-bold text-sub">{copy.proofSampleUnit}</span></p>
                  </div>
                  <div className="rounded-panel border border-gray-100 bg-white p-6">
                    <p className="text-sm font-bold text-sub">{copy.proofPeriod}</p>
                    <p className="mt-2 text-lg font-extrabold text-ink">{period}</p>
                  </div>
                </section>

                <section aria-labelledby="proof-durations" className="mt-8 rounded-panel border border-gray-100 bg-white p-6">
                  <h2 id="proof-durations" className="text-lg font-extrabold text-ink">{copy.proofDurationsTitle}</h2>
                  <p className="mt-1 max-w-2xl text-sm text-sub">{copy.proofDurationsDesc}</p>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-gray-100 text-xs text-sub">
                        <tr>
                          <th scope="col" className="py-2 pr-3 font-bold">{copy.proofEvent}</th>
                          <th scope="col" className="py-2 pr-3 text-right font-bold">p50</th>
                          <th scope="col" className="py-2 pr-3 text-right font-bold">p95</th>
                          <th scope="col" className="py-2 text-right font-bold">{copy.proofSamples}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {DURATION_ROWS.map(name => {
                          const stats = summary.durations[name]
                          return (
                            <tr key={name} className="border-b border-gray-100 last:border-b-0">
                              <th scope="row" className="py-3 pr-3 font-bold text-ink">{durationLabel(name, copy)}</th>
                              <td className={`py-3 pr-3 text-right tabular-nums whitespace-nowrap ${stats ? 'text-ink' : 'text-sub'}`}>{duration(stats?.p50Ms)}</td>
                              <td className={`py-3 pr-3 text-right tabular-nums whitespace-nowrap ${stats ? 'text-ink' : 'text-sub'}`}>{duration(stats?.p95Ms)}</td>
                              <td className="py-3 text-right tabular-nums text-ink">{number.format(stats?.n ?? 0)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section aria-labelledby="proof-events" className="mt-8 rounded-panel border border-gray-100 bg-white p-6">
                  <h2 id="proof-events" className="text-lg font-extrabold text-ink">{copy.proofEventsTitle}</h2>
                  <dl className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                    {COUNT_ROWS.map(name => (
                      <div key={name} className="flex items-baseline justify-between gap-3 border-b border-gray-100 pb-2">
                        <dt className="text-sm text-sub">{eventLabel(name, copy)}</dt>
                        <dd className="text-lg font-extrabold tabular-nums text-ink">{number.format(summary.eventCounts[name])}</dd>
                      </div>
                    ))}
                  </dl>
                </section>

                <section className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-panel border border-dashed border-gray-200 p-6">
                  <p className="max-w-xl text-sm text-sub">{copy.proofCsvDesc}</p>
                  <Button variant="outline" onClick={() => void downloadCsv()} disabled={downloading || mock}>
                    {downloading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
                    {copy.proofCsv}
                  </Button>
                </section>
              </>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  )
}
