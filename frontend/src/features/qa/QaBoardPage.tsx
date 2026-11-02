import { Loader2, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Button from '../../components/Button'
import Footer from '../../components/Footer'
import StateNotice from '../../components/StateNotice'
import { useToast } from '../../components/Toast'
import { useSiteLang } from '../../i18n/LanguageContext'
import { qaCopy } from '../../i18n/qa'
import { trackEvent } from '../../lib/analytics'
import { OUTPUT_PRESETS, type OutputPreset } from '../../lib/exportImage'
import { restoreCloudProject, type CloudWorkspace } from '../../lib/api'
import { RequestError, requestErrorMessage } from '../../lib/requestError'
import { useAuth } from '../../store/AuthContext'
import { isQaReportStale, type QaProjectResponse } from '../../types/qa'
import EvidenceDrawer from './EvidenceDrawer'
import { MOCK_IMAGES, MOCK_QA_RESPONSE } from './mockQaReport'
import { fetchQaProject, runQaInspect } from './qaApi'
import QaGrid from './QaGrid'
import QaHistory from './QaHistory'
import { loadSavedPreset, renderWorkspacePngs, saveSavedPreset } from './qaRender'
import { editorLink, findingsByImage, imageVerdict, isInspectableStatus, severityCounts, type QaImage, type QaVerdict } from './qaReport'
import { VerdictBadge } from './SeverityBadge'

type Filter = QaVerdict | 'all'
const FILTERS: Filter[] = ['all', 'fail', 'review', 'pass', 'pending']
const PRESET_OPTIONS = [
  ['default', 'qaPresetDefault'],
  ['ogq-main', 'qaPresetOgqMain'],
  ['ogq-sticker', 'qaPresetOgqSticker'],
  ['ogq-tab', 'qaPresetOgqTab'],
] as const satisfies ReadonlyArray<readonly [OutputPreset, 'qaPresetDefault' | 'qaPresetOgqMain' | 'qaPresetOgqSticker' | 'qaPresetOgqTab']>
const EMPTY_RESPONSE: QaProjectResponse = { latest: null, history: [] }

/** FEAT-02 QA Board — /qa?projectId=<id>. 개발 서버에서는 /qa?mock=1로 목업을 볼 수 있다. */
export default function QaBoardPage() {
  const { lang } = useSiteLang()
  const copy = qaCopy(lang)
  const navigate = useNavigate()
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  // 목업은 개발 빌드에서만 켤 수 있다 — 배포 화면에 가짜 판정이 섞이지 않게 한다.
  const mock = import.meta.env.DEV && searchParams.get('mock') === '1'
  const { isAuthenticated, checkingSession, token } = useAuth()

  const [images, setImages] = useState<QaImage[]>([])
  const [workspace, setWorkspace] = useState<CloudWorkspace | null>(null)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [qa, setQa] = useState<QaProjectResponse>(EMPTY_RESPONSE)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const reviewedProject = useRef<string | null>(null)
  const [preset, setPreset] = useState<OutputPreset>('default')
  // 에디터·결과 화면에서 이 프로젝트에 고른 규격이 같은 세션에 남아 있으면 그대로 이어받는다.
  useEffect(() => { if (projectId) setPreset(loadSavedPreset(projectId)) }, [projectId])

  const load = useCallback(async () => {
    if (mock) {
      setImages(MOCK_IMAGES)
      setQa(MOCK_QA_RESPONSE)
      return
    }
    if (!projectId || !isAuthenticated) return
    setLoading(true)
    setLoadError(null)
    try {
      const restored = await restoreCloudProject(projectId)
      setWorkspace(restored)
      setImages(restored.results.assets.map(asset => ({
        id: asset.id,
        name: asset.name,
        url: asset.cleanedUrl ?? asset.originalUrl,
        width: asset.width,
        height: asset.height,
        inspectable: isInspectableStatus(asset.status),
      })))
      // 한 번도 검사하지 않은 프로젝트는 404일 수 있다 — 오류가 아니라 "검사 기록 없음"으로 본다.
      const response = await fetchQaProject(projectId, token, restored.projectToken).catch((error: unknown) => {
        if (error instanceof RequestError && error.status === 404) return EMPTY_RESPONSE
        throw error
      })
      setQa(response)
      // 본선 C-04: 실제 프로젝트의 검사 결과를 연 횟수(목업은 세지 않음). 프로젝트당 한 번만.
      if (reviewedProject.current !== projectId) {
        reviewedProject.current = projectId
        trackEvent('qa_reviewed', { projectId, imageCount: restored.results.assets.length })
      }
    } catch (error) {
      setLoadError(requestErrorMessage(error, lang, copy.qaLoadFailed))
    } finally {
      setLoading(false)
    }
  }, [mock, projectId, isAuthenticated, token, lang, copy.qaLoadFailed])

  useEffect(() => { void load() }, [load])

  const runInspection = async () => {
    if (!projectId || !workspace || running || mock) return
    setRunning(true)
    setProgress({ done: 0, total: 0 })
    try {
      // 서버는 PNG를 받은 이미지만 규격을 판정하므로, 실제로 내려받을 이미지를 먼저 만들어 같이 보낸다.
      const { pngs, failed } = await renderWorkspacePngs(workspace, (done, total) => setProgress({ done, total }), undefined, preset)
      await runQaInspect(projectId, token, workspace.projectToken, pngs)
      setQa(await fetchQaProject(projectId, token, workspace.projectToken))
      if (failed.length > 0) toast(copy.qaRenderPartial.replace('{n}', String(failed.length)), 'warning')
    } catch (error) {
      toast(requestErrorMessage(error, lang, copy.qaRunFailed), 'warning')
    } finally {
      setRunning(false)
      setProgress(null)
    }
  }

  const grouped = useMemo(() => findingsByImage(qa.latest), [qa.latest])
  const counts = useMemo(() => severityCounts(images, grouped), [images, grouped])
  const selectedImage = images.find(image => image.id === selectedId) ?? null
  const formatter = new Intl.DateTimeFormat(lang, { dateStyle: 'medium', timeStyle: 'short' })

  const shell = (children: ReactNode) => (
    <div className="flex min-h-svh flex-col">
      <main id="main-content" tabIndex={-1} className="layout-app flex-1 py-10">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{copy.qaPageTitle}</h1>
        <p className="mt-2 max-w-2xl font-medium text-sub">{copy.qaPageDesc}</p>
        {children}
      </main>
      <Footer />
    </div>
  )

  if (!mock && !projectId) {
    return shell(<StateNotice className="mt-8" action={<Button onClick={() => navigate('/archive')}>{copy.qaGoProjects}</Button>}>{copy.qaNoProject}</StateNotice>)
  }
  if (!mock && checkingSession) {
    return shell(<p role="status" className="mt-8 flex items-center gap-2 text-sm text-sub"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />{copy.qaLoading}</p>)
  }
  if (!mock && !isAuthenticated) {
    const next = `/qa?projectId=${encodeURIComponent(projectId ?? '')}`
    return shell(<StateNotice className="mt-8" action={<Button onClick={() => navigate(`/login?next=${encodeURIComponent(next)}`)}>{copy.qaLogin}</Button>}>{copy.qaLoginRequired}</StateNotice>)
  }

  return shell(
    <>
      {mock && <StateNotice className="mt-6">{copy.qaMockBanner}</StateNotice>}
      <p className="mt-4 text-xs text-sub">{copy.qaDisclaimer}</p>
      <p className="mt-1 text-xs text-sub">{copy.qaSpecHint}</p>

      {loading && <p role="status" className="mt-8 flex items-center gap-2 text-sm text-sub"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />{copy.qaLoading}</p>}
      {loadError && <StateNotice error className="mt-8" action={<Button variant="secondary" onClick={() => void load()}>{copy.qaRetry}</Button>}>{loadError}</StateNotice>}

      {!loading && !loadError && (
        <>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <div role="group" aria-label={copy.qaImageCount} className="flex flex-wrap gap-2">
              {FILTERS.filter(value => value !== 'pending' || counts.pending > 0).map(value => {
                const count = value === 'all' ? images.length : counts[value]
                const active = filter === value
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setFilter(value)}
                    className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm font-bold transition ${active ? 'border-brand bg-brand-soft text-ink' : 'border-gray-200 text-sub hover:border-brand/50'}`}
                  >
                    {value === 'all' ? copy.qaFilterAll : <VerdictBadge verdict={value} copy={copy} />}
                    <span>{count}</span>
                  </button>
                )
              })}
            </div>
            {!mock && (
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm font-bold text-sub">
                  {copy.qaPresetLabel}
                  <select
                    value={preset}
                    disabled={running}
                    onChange={event => {
                      const next = event.target.value as OutputPreset
                      setPreset(next)
                      if (projectId) saveSavedPreset(projectId, next)
                    }}
                    className="min-h-10 rounded-control border border-gray-200 bg-white px-3 text-sm font-bold text-ink"
                  >
                    {PRESET_OPTIONS.map(([value, label]) => (
                      <option key={value} value={value}>{copy[label]} · {OUTPUT_PRESETS[value].width}×{OUTPUT_PRESETS[value].height}</option>
                    ))}
                  </select>
                </label>
              <Button onClick={() => void runInspection()} disabled={running || !workspace || images.length === 0}>
                {running ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
                {running ? (progress && progress.total > 0 ? copy.qaPreparing.replace('{done}', String(progress.done)).replace('{total}', String(progress.total)) : copy.qaRunning) : qa.latest ? copy.qaRerun : copy.qaRun}
              </Button>
              </div>
            )}
          </div>
          {!mock && preset === 'default' && <p className="mt-2 text-xs text-sub">{copy.qaPresetDefaultHint}</p>}

          {isQaReportStale(qa) && <StateNotice className="mt-6">{copy.qaStale}</StateNotice>}
          {qa.latest
            ? <p className="mt-3 text-xs text-sub">{copy.qaInspectedAt} {formatter.format(new Date(qa.latest.inspectedAt))} · {copy.qaRuleset} {qa.latest.rulesetVersion}</p>
            : <StateNotice className="mt-6">{copy.qaEmpty}</StateNotice>}

          {qa.latest && (
            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
              <QaGrid images={images} grouped={grouped} copy={copy} filter={filter} selectedId={selectedId} onSelect={setSelectedId} />
              <div className="flex flex-col gap-6 lg:sticky lg:top-[calc(var(--site-header-height)+1rem)]">
                {selectedImage && (
                  <EvidenceDrawer
                    image={selectedImage}
                    findings={grouped.get(selectedImage.id) ?? []}
                    copy={copy}
                    onClose={() => setSelectedId(null)}
                    fixLink={projectId ? finding => editorLink(projectId, selectedImage, finding?.region) : undefined}
                  />
                )}
                {!selectedImage && images.length > 0 && (
                  <p className="rounded-panel border border-dashed border-gray-200 p-5 text-sm text-sub">
                    {copy.qaDrawerTitle} — {images.filter(image => ['fail', 'review'].includes(imageVerdict(image, grouped.get(image.id)))).length} / {images.length}
                  </p>
                )}
                <QaHistory history={qa.history} copy={copy} locale={lang} />
              </div>
            </div>
          )}
        </>
      )}
    </>,
  )
}
