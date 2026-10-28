import { Download, Loader2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Button from '../../components/Button'
import Footer from '../../components/Footer'
import StateNotice from '../../components/StateNotice'
import { useToast } from '../../components/Toast'
import { useSiteLang } from '../../i18n/LanguageContext'
import { proofCopy, type ProofCopy } from '../../i18n/proof'
import { requestErrorMessage } from '../../lib/requestError'
import type { ExperimentGroup, ProofPercentiles, ProofSummary } from '../../types/analytics'
import { MOCK_PROOF_SUMMARY } from './mockProof'
import { fetchProofCsv, fetchProofSummary } from './proofApi'

const OPTIONAL_GROUPS: ExperimentGroup[] = ['internal', 'demo']
type StageKey = keyof ProofSummary['stages']
const STAGES: StageKey[] = ['ocr', 'translation', 'cleanup', 'total']

function stageLabel(stage: StageKey, copy: ProofCopy) {
  return stage === 'ocr' ? copy.proofStageOcr : stage === 'translation' ? copy.proofStageTranslation : stage === 'cleanup' ? copy.proofStageCleanup : copy.proofStageTotal
}

function groupLabel(group: ExperimentGroup, copy: ProofCopy) {
  return group === 'external' ? copy.proofGroupExternal : group === 'internal' ? copy.proofGroupInternal : copy.proofGroupDemo
}

/** FEAT-07 Proof — 실제 이벤트에서 계산한 완주율·처리 시간. 개발 서버에서는 /proof?mock=1로 목업을 볼 수 있다. */
export default function ProofPage() {
  const { lang } = useSiteLang()
  const copy = proofCopy(lang)
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const mock = import.meta.env.DEV && searchParams.get('mock') === '1'
  const [extraGroups, setExtraGroups] = useState<ExperimentGroup[]>([])
  const [summary, setSummary] = useState<ProofSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const groups: ExperimentGroup[] = ['external', ...extraGroups]

  const load = useCallback(async (selected: ExperimentGroup[]) => {
    setLoading(true)
    setLoadError(null)
    try {
      setSummary(mock ? { ...MOCK_PROOF_SUMMARY, groups: selected } : await fetchProofSummary(selected))
    } catch (error) {
      setLoadError(requestErrorMessage(error, lang, copy.proofLoadFailed))
    } finally {
      setLoading(false)
    }
  }, [mock, lang, copy.proofLoadFailed])

  const groupsKey = groups.join(',')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load(groups) }, [load, groupsKey])

  const toggleGroup = (group: ExperimentGroup) => {
    setExtraGroups(current => current.includes(group) ? current.filter(value => value !== group) : [...current, group])
  }

  const downloadCsv = async () => {
    if (downloading || mock) return
    setDownloading(true)
    try {
      const blob = await fetchProofCsv(groups)
      // lib/exportImage의 downloadBlob을 쓰면 내보내기 완주 이벤트로 잘못 세어지므로 직접 내려받는다.
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `glocalizer-proof-${groups.join('-')}.csv`
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
  const duration = (ms: number | null) => {
    if (ms === null) return copy.proofNotMeasured
    if (ms < 1000) return `${number.format(Math.round(ms))} ms`
    return `${new Intl.NumberFormat(lang, { maximumFractionDigits: 1 }).format(ms / 1000)} s`
  }
  const period = summary?.periodStart && summary.periodEnd
    ? `${date.format(new Date(summary.periodStart))} – ${date.format(new Date(summary.periodEnd))}`
    : copy.proofNotMeasured
  const includesNonExternal = extraGroups.length > 0

  return (
    <div className="flex min-h-svh flex-col">
      <main id="main-content" tabIndex={-1} className="layout-app flex-1 py-10">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{copy.proofPageTitle}</h1>
        <p className="mt-2 max-w-2xl font-medium text-sub">{copy.proofPageDesc}</p>
        {mock && <StateNotice className="mt-6">{copy.proofMockBanner}</StateNotice>}

        <fieldset className="mt-8">
          <legend className="text-sm font-extrabold text-ink">{copy.proofGroups}</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            <label className="inline-flex min-h-10 items-center gap-2 rounded-full border border-brand bg-brand-soft px-4 text-sm font-bold">
              <input type="checkbox" checked disabled className="h-4 w-4 accent-[var(--color-brand)]" />
              {copy.proofGroupExternal}
            </label>
            {OPTIONAL_GROUPS.map(group => (
              <label key={group} className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-gray-200 px-4 text-sm font-bold text-sub has-[:checked]:border-brand has-[:checked]:text-ink">
                <input type="checkbox" checked={extraGroups.includes(group)} onChange={() => toggleGroup(group)} className="h-4 w-4 accent-[var(--color-brand)]" />
                {groupLabel(group, copy)}
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-sub">{copy.proofGroupsHint}</p>
        </fieldset>

        {loading && <p role="status" className="mt-8 flex items-center gap-2 text-sm text-sub"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />{copy.proofLoading}</p>}
        {loadError && <StateNotice error className="mt-8" action={<Button variant="secondary" onClick={() => void load(groups)}>{copy.proofRetry}</Button>}>{loadError}</StateNotice>}

        {!loading && !loadError && summary && (
          <>
            {includesNonExternal && <StateNotice className="mt-6">{copy.proofIncludesNonExternal} ({summary.groups.map(group => groupLabel(group, copy)).join(' · ')})</StateNotice>}
            {summary.sampleCount === 0 && <StateNotice className="mt-6">{copy.proofEmpty}</StateNotice>}

            <section aria-label={copy.proofCompletionRate} className="mt-8 grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
              <div className="rounded-panel border border-gray-100 bg-white p-6">
                <p className="text-sm font-bold text-sub">{copy.proofCompletionRate}</p>
                <p className="mt-2 text-5xl font-extrabold tracking-tight text-ink">{summary.completionRate === null ? copy.proofNotMeasured : percent.format(summary.completionRate)}</p>
                <p className="mt-3 text-xs text-sub">{copy.proofCompletionDef}</p>
              </div>
              <div className="rounded-panel border border-gray-100 bg-white p-6">
                <p className="text-sm font-bold text-sub">{copy.proofSampleCount}</p>
                <p className="mt-2 text-3xl font-extrabold text-ink">{number.format(summary.sampleCount)} <span className="text-base font-bold text-sub">{copy.proofSampleUnit}</span></p>
              </div>
              <div className="rounded-panel border border-gray-100 bg-white p-6">
                <p className="text-sm font-bold text-sub">{copy.proofPeriod}</p>
                <p className="mt-2 text-lg font-extrabold text-ink">{period}</p>
              </div>
            </section>

            <section aria-labelledby="proof-stages" className="mt-8 rounded-panel border border-gray-100 bg-white p-6">
              <h2 id="proof-stages" className="text-lg font-extrabold text-ink">{copy.proofStagesTitle}</h2>
              <p className="mt-1 max-w-2xl text-sm text-sub">{copy.proofStagesDesc}</p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-gray-100 text-xs text-sub">
                    <tr>
                      <th scope="col" className="py-2 pr-3 font-bold">{copy.proofStage}</th>
                      <th scope="col" className="py-2 pr-3 text-right font-bold">p50</th>
                      <th scope="col" className="py-2 pr-3 text-right font-bold">p95</th>
                      <th scope="col" className="py-2 text-right font-bold">{copy.proofSampleCount}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {STAGES.map(stage => {
                      const row: ProofPercentiles = summary.stages[stage]
                      return (
                        <tr key={stage} className={`border-b border-gray-100 last:border-b-0 ${stage === 'total' ? 'font-extrabold' : ''}`}>
                          <th scope="row" className="py-3 pr-3 font-bold text-ink">{stageLabel(stage, copy)}</th>
                          <td className={`py-3 pr-3 text-right tabular-nums ${row.p50Ms === null ? 'text-sub' : 'text-ink'}`}>{duration(row.p50Ms)}</td>
                          <td className={`py-3 pr-3 text-right tabular-nums ${row.p95Ms === null ? 'text-sub' : 'text-ink'}`}>{duration(row.p95Ms)}</td>
                          <td className="py-3 text-right tabular-nums text-ink">{number.format(row.sampleCount)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
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
      </main>
      <Footer />
    </div>
  )
}
