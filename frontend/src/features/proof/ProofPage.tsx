import { Download, KeyRound, Loader2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import Button from '../../components/Button'
import Footer from '../../components/Footer'
import StateNotice from '../../components/StateNotice'
import { useToast } from '../../components/Toast'
import { useSiteLang } from '../../i18n/LanguageContext'
import { proofCopy, type ProofCopy } from '../../i18n/proof'
import { RequestError, requestErrorMessage } from '../../lib/requestError'
import type { AnalyticsEventName, ExperimentGroup, LocalizationStage, ProofDurationStats, ProofSummary } from '../../types/analytics'
import { MOCK_PROOF_SUMMARY } from './mockProof'
import { fetchProofCsv, fetchProofSummary } from './proofApi'

const GROUPS: ExperimentGroup[] = ['external', 'internal', 'demo']
const KEY_STORAGE = 'glocalizer:proofAdminKey'
const DURATION_ROWS: AnalyticsEventName[] = ['localization_completed', 'export_succeeded', 'export_failed']
const STAGE_ROWS: LocalizationStage[] = ['recognizing', 'translating', 'cleaning']
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

function stageLabel(stage: LocalizationStage, copy: ProofCopy) {
  return stage === 'recognizing' ? copy.proofStageRecognizing : stage === 'translating' ? copy.proofStageTranslating : copy.proofStageCleaning
}

function storedKey(): string {
  try { return sessionStorage.getItem(KEY_STORAGE) ?? '' } catch { return '' }
}

function forgetStoredKey() {
  try { sessionStorage.removeItem(KEY_STORAGE) } catch { /* 저장소를 못 쓰는 환경 — 무시 */ }
}

/** p50·p95·표본 수 표. 값이 없으면(null) "측정 안 됨". 처리 시간과 단계별 시간이 같은 모양을 쓴다. */
function DurationTable({ id, title, desc, rows, copy, format, number }: {
  id: string
  title: string
  desc: string
  rows: Array<{ key: string; label: string; stats: ProofDurationStats | null }>
  copy: ProofCopy
  format: (ms: number | undefined) => string
  number: Intl.NumberFormat
}) {
  return (
    <section aria-labelledby={id} className="mt-8 rounded-panel border border-gray-100 bg-white p-6">
      <h2 id={id} className="text-lg font-extrabold text-ink">{title}</h2>
      <p className="mt-1 max-w-2xl text-sm text-sub">{desc}</p>
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
            {rows.map(({ key, label, stats }) => (
              <tr key={key} className="border-b border-gray-100 last:border-b-0">
                <th scope="row" className="py-3 pr-3 font-bold text-ink">{label}</th>
                <td className={`whitespace-nowrap py-3 pr-3 text-right tabular-nums ${stats ? 'text-ink' : 'text-sub'}`}>{format(stats?.p50Ms)}</td>
                <td className={`whitespace-nowrap py-3 pr-3 text-right tabular-nums ${stats ? 'text-ink' : 'text-sub'}`}>{format(stats?.p95Ms)}</td>
                <td className="py-3 text-right tabular-nums text-ink">{number.format(stats?.n ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

/**
 * FEAT-07 Proof — 서버 이벤트에서 계산한 완주율·처리 시간. 실사용자(external) 집계는 키 없이 공개되고(PR #215),
 * 팀 내부·샘플 체험 집계와 원자료 CSV만 관리자 키를 묻는다. 개발 서버에서는 /proof?mock=1로 목업을 볼 수 있다.
 */
export default function ProofPage() {
  const { lang } = useSiteLang()
  const copy = proofCopy(lang)
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const mock = import.meta.env.DEV && searchParams.get('mock') === '1'
  const [group, setGroup] = useState<ExperimentGroup>('external')
  const [adminKey, setAdminKey] = useState(storedKey)
  const [keyInput, setKeyInput] = useState('')
  const [keyError, setKeyError] = useState<string | null>(null)
  const [csvRequested, setCsvRequested] = useState(false)
  const [summary, setSummary] = useState<ProofSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const keyInputRef = useRef<HTMLInputElement>(null)
  const groupNeedsKey = group !== 'external'
  // 키 입력칸은 키가 필요한 일을 하려 할 때만 보여준다(팀 내부·샘플 탭 선택, CSV 다운로드).
  const showKeyForm = !mock && !adminKey && (groupNeedsKey || csvRequested)

  /** 보낸 키가 틀렸을 때: 저장된 키를 지우고 다시 입력하게 한다. external이면 키 없이 다시 불러온다. */
  const rejectKey = useCallback(() => {
    forgetStoredKey()
    setAdminKey('')
    setKeyError(copy.proofKeyRequired)
  }, [copy.proofKeyRequired])

  // 탭·키가 바뀌면 이전 요청의 응답은 버린다. 늦게 온 실사용자 숫자가 다른 탭에 보이지 않게 한다.
  const loadRequest = useRef(0)
  const load = useCallback(async () => {
    const request = ++loadRequest.current
    if (mock) { setSummary({ ...MOCK_PROOF_SUMMARY, experimentGroup: group }); return }
    setLoadError(null)
    if (group !== 'external' && !adminKey) { setSummary(null); setLoading(false); return }
    setLoading(true)
    try {
      const next = await fetchProofSummary(group, adminKey || null)
      if (request === loadRequest.current) setSummary(next)
    } catch (error) {
      if (request !== loadRequest.current) return
      if (adminKey && error instanceof RequestError && (error.status === 401 || error.status === 403 || error.code === 'INVALID_STATS_KEY')) {
        setSummary(null)
        rejectKey()
      } else {
        setLoadError(requestErrorMessage(error, lang, copy.proofLoadFailed))
      }
    } finally {
      if (request === loadRequest.current) setLoading(false)
    }
  }, [mock, group, adminKey, lang, copy.proofLoadFailed, rejectKey])

  useEffect(() => { void load() }, [load])
  useEffect(() => { if (showKeyForm) keyInputRef.current?.focus() }, [showKeyForm])

  const submitKey = (event: FormEvent) => {
    event.preventDefault()
    const value = keyInput.trim()
    if (!value) return
    try { sessionStorage.setItem(KEY_STORAGE, value) } catch { /* 저장소를 못 쓰면 이번 화면에서만 유지 */ }
    setKeyInput('')
    setKeyError(null)
    setAdminKey(value)
  }

  const clearKey = () => {
    forgetStoredKey()
    setAdminKey('')
    setKeyError(null)
    setCsvRequested(false)
  }

  const downloadCsv = async () => {
    if (downloading || mock) return
    if (!adminKey) { setCsvRequested(true); return }
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
      if (error instanceof RequestError && (error.status === 401 || error.status === 403 || error.code === 'INVALID_STATS_KEY')) {
        setCsvRequested(true)
        rejectKey()
      } else {
        toast(requestErrorMessage(error, lang, copy.proofCsvFailed), 'warning')
      }
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

  const keyForm = (
    <form onSubmit={submitKey} className="mt-6 max-w-xl rounded-panel border border-gray-100 bg-white p-6">
      <label htmlFor="proof-admin-key" className="flex items-center gap-2 text-sm font-extrabold text-ink">
        <KeyRound className="h-4 w-4" aria-hidden="true" />
        {copy.proofKeyTitle}
      </label>
      <p className="mt-1 text-sm font-bold text-ink">{groupNeedsKey ? copy.proofKeyNeededGroup : copy.proofKeyNeededCsv}</p>
      <p className="mt-1 text-xs text-sub">{copy.proofKeyDesc}</p>
      <div className="mt-3 flex gap-2">
        <input ref={keyInputRef} id="proof-admin-key" type="password" autoComplete="off" value={keyInput} onChange={event => setKeyInput(event.target.value)} placeholder={copy.proofKeyPlaceholder} className="ui-input min-w-0 flex-1" />
        <Button type="submit" disabled={!keyInput.trim()}>{copy.proofKeySubmit}</Button>
      </div>
      {keyError && <p role="alert" className="mt-3 text-sm font-bold text-red-700 dark:text-red-300">{keyError}</p>}
    </form>
  )

  return (
    <div className="flex min-h-svh flex-col">
      <main id="main-content" tabIndex={-1} className="layout-app flex-1 py-10">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{copy.proofPageTitle}</h1>
        <p className="mt-2 max-w-2xl font-medium text-sub">{copy.proofPageDesc}</p>
        {mock && <StateNotice className="mt-6">{copy.proofMockBanner}</StateNotice>}

        <fieldset className="mt-8">
          <legend className="text-sm font-extrabold text-ink">{copy.proofGroups}</legend>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {GROUPS.map(value => (
              <label key={value} className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-gray-200 px-4 text-sm font-bold text-sub has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:checked]:text-ink">
                <input type="radio" name="proof-group" checked={group === value} onChange={() => setGroup(value)} className="h-4 w-4 accent-[var(--color-brand)]" />
                {groupLabel(value, copy)}
                {value !== 'external' && !adminKey && !mock && <KeyRound className="h-3.5 w-3.5" aria-label={copy.proofKeyTitle} />}
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-sub">{copy.proofGroupsHint}</p>
          {adminKey && !mock && (
            <p className="mt-2 flex items-center gap-2 text-xs text-sub">
              <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
              {copy.proofKeyActive}
              <button type="button" onClick={clearKey} className="ui-link font-bold">{copy.proofKeyForget}</button>
            </p>
          )}
        </fieldset>

        {showKeyForm && groupNeedsKey && keyForm}

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

            <DurationTable
              id="proof-durations"
              title={copy.proofDurationsTitle}
              desc={copy.proofDurationsDesc}
              rows={DURATION_ROWS.map(name => ({ key: name, label: durationLabel(name, copy), stats: summary.durations[name] }))}
              copy={copy}
              format={duration}
              number={number}
            />

            <DurationTable
              id="proof-stages"
              title={copy.proofStagesTitle}
              desc={copy.proofStagesDesc}
              rows={STAGE_ROWS.map(stage => ({ key: stage, label: stageLabel(stage, copy), stats: summary.stageDurations?.[stage] ?? null }))}
              copy={copy}
              format={duration}
              number={number}
            />

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

            <section className="mt-8 rounded-panel border border-dashed border-gray-200 p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <p className="max-w-xl text-sm text-sub">{copy.proofCsvDesc}</p>
                <Button variant="outline" onClick={() => void downloadCsv()} disabled={downloading || mock}>
                  {downloading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : adminKey || mock ? <Download className="h-4 w-4" aria-hidden="true" /> : <KeyRound className="h-4 w-4" aria-hidden="true" />}
                  {copy.proofCsv}
                </Button>
              </div>
              {showKeyForm && !groupNeedsKey && keyForm}
            </section>
          </>
        )}
      </main>
      <Footer />
    </div>
  )
}
