import { ArrowLeft, Check, Loader2, Sparkles, Undo2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import SessionNotice from '../components/SessionNotice'
import { useToast } from '../components/Toast'
import { useAuth } from '../store/AuthContext'
import { useSiteLang } from '../i18n/LanguageContext'
import { workflowCopy } from '../i18n/workflow'
import { captionSuggestCopy } from '../i18n/captionSuggest'
import { useUploads, type UploadFile } from '../store/uploads'
import type { ApiCaptionSuggestion } from '../lib/api'
import { RequestError } from '../lib/requestError'
import { CaptionApplicationError, waitForCaptionApplication } from '../lib/captionApplication'
import type { NormalizedRect } from '../lib/style'

type Anchor = 'top' | 'bottom'
type Choice = { text: string; anchor: Anchor }
type Step = 'detect' | 'analyze' | 'review'

const TOP_BOX: NormalizedRect = { x: 0.1, y: 0.04, width: 0.8, height: 0.22 }
const BOTTOM_BOX: NormalizedRect = { x: 0.1, y: 0.74, width: 0.8, height: 0.22 }
const defaultBoxFor = (anchor: Anchor): NormalizedRect => (anchor === 'top' ? TOP_BOX : BOTTOM_BOX)
const truncate12 = (value: string) => Array.from(value).slice(0, 12).join('')

export default function CaptionSuggest() {
  const { token, checkingSession } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const { lang } = useSiteLang()
  const t = captionSuggestCopy(lang)
  const w = workflowCopy[lang]
  const { files, selectedFileIds, projectStatus, refreshProject, getLatestProjectResults, addOcrRegion, suggestCaption } = useUploads()

  const [pipelineLoading, setPipelineLoading] = useState(true)
  const [step, setStep] = useState<Step>('detect')
  const [activeFileId, setActiveFileId] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<Record<string, ApiCaptionSuggestion>>({})
  const [analyzing, setAnalyzing] = useState<Record<string, boolean>>({})
  const [analyzeErrors, setAnalyzeErrors] = useState<Record<string, boolean>>({})
  const [choices, setChoices] = useState<Record<string, Choice>>({})
  const [removed, setRemoved] = useState<Set<string>>(new Set())
  const [reviewFiles, setReviewFiles] = useState<UploadFile[] | null>(null)
  const [applyResults, setApplyResults] = useState<Record<string, 'applied' | 'failed' | 'pending'>>({})
  const submitted = useRef(new Set<string>())
  const applyLock = useRef(false)
  const [applying, setApplying] = useState(false)
  const [applyProgress, setApplyProgress] = useState({ done: 0, total: 0 })

  const selectedFiles = useMemo(() => files.filter(file => selectedFileIds.includes(file.id)), [files, selectedFileIds])
  const textless = useMemo(() => selectedFiles.filter(file => file.analysis && file.analysis.regions.length === 0), [selectedFiles])
  // projectStatus flips to completed/failed slightly before the matching getProjectResults() call
  // (triggered inside that same refreshProject()) lands analysis data onto `files` — wait for both.
  const resultsReady = selectedFiles.length > 0 && selectedFiles.every(file => Boolean(file.analysis))

  useEffect(() => {
    if (step === 'review' || !projectStatus || projectStatus.status === 'completed') { setPipelineLoading(false); return }
    if (projectStatus.status === 'failed') { setPipelineLoading(false); toast(projectStatus.message || t.loading); return }
    setPipelineLoading(true)
    const timer = window.setInterval(() => {
      refreshProject().catch(error => { setPipelineLoading(false); toast(error instanceof Error ? error.message : t.loading) })
    }, 1500)
    return () => window.clearInterval(timer)
  }, [projectStatus, refreshProject, t.loading, toast, step])

  useEffect(() => {
    if (pipelineLoading || !resultsReady || step !== 'detect') return
    if (textless.length === 0) navigate('/editor', { replace: true })
  }, [pipelineLoading, resultsReady, textless.length, navigate, step])

  const fetchSuggestion = async (file: UploadFile) => {
    setAnalyzing(prev => ({ ...prev, [file.id]: true }))
    setAnalyzeErrors(prev => ({ ...prev, [file.id]: false }))
    try {
      const result = await suggestCaption(file.id)
      setSuggestions(prev => ({ ...prev, [file.id]: result }))
      const best = result.candidates.find(candidate => candidate.best) ?? result.candidates[0]
      if (best) setChoices(prev => (prev[file.id] ? prev : { ...prev, [file.id]: { text: best.text, anchor: 'top' } }))
    } catch {
      setAnalyzeErrors(prev => ({ ...prev, [file.id]: true }))
    } finally {
      setAnalyzing(prev => ({ ...prev, [file.id]: false }))
    }
  }

  const startAnalysis = () => {
    setStep('analyze')
    setActiveFileId(textless[0]?.id ?? null)
    for (const file of textless) {
      if (!suggestions[file.id] && !analyzing[file.id]) void fetchSuggestion(file)
    }
  }

  const setChoiceText = (fileId: string, text: string) => {
    setChoices(prev => ({ ...prev, [fileId]: { text: truncate12(text), anchor: prev[fileId]?.anchor ?? 'top' } }))
  }
  const setChoiceAnchor = (fileId: string, anchor: Anchor) => {
    setChoices(prev => ({ ...prev, [fileId]: { text: prev[fileId]?.text ?? '', anchor } }))
  }

  const reviewPool = reviewFiles ?? textless
  const reviewItems = reviewPool.filter(file => !removed.has(file.id) && choices[file.id]?.text.trim() && applyResults[file.id] !== 'applied')
  const canReview = textless.some(file => choices[file.id]?.text.trim())

  const handleApply = async () => {
    if (applyLock.current) return
    const chosen = reviewItems
    if (chosen.length === 0) { navigate('/editor'); return }
    applyLock.current = true
    setApplying(true)
    setApplyProgress({ done: 0, total: chosen.length })
    let hadFailure = false
    try {
      for (const file of chosen) {
        const choice = choices[file.id]
        let accepted = submitted.current.has(file.id)
        try {
          if (!accepted) {
            await addOcrRegion(file.id, choice.text, defaultBoxFor(choice.anchor))
            submitted.current.add(file.id)
            accepted = true
          }
          await waitForCaptionApplication(refreshProject, file.assetId ?? '')
          const results = await getLatestProjectResults()
          const asset = results.assets.find(asset => asset.id === file.assetId)
          const box = defaultBoxFor(choice.anchor)
          // Reconcile a lost POST response before allowing another submission.
          const applied = asset?.ocr.regions.some(region => region.text === choice.text && region.normalizedBox &&
            ['x', 'y', 'width', 'height'].every(key => Math.abs(region.normalizedBox![key as keyof NormalizedRect] - box[key as keyof NormalizedRect]) < 0.01))
          if (!applied) throw new CaptionApplicationError('failed')
          setApplyResults(previous => ({ ...previous, [file.id]: 'applied' }))
        } catch (error) {
          hadFailure = true
          const uncertain = accepted || (error instanceof RequestError && error.status === 0)
          if (uncertain) submitted.current.add(file.id)
          setApplyResults(previous => ({ ...previous, [file.id]: uncertain && !(error instanceof CaptionApplicationError && error.reason === 'failed') ? 'pending' : 'failed' }))
        }
        setApplyProgress(progress => ({ ...progress, done: progress.done + 1 }))
      }
    } finally {
      applyLock.current = false
      setApplying(false)
    }
    if (hadFailure) toast(t.applyFailed)
    else navigate('/editor')
  }

  if (checkingSession) return <main id="main-content" tabIndex={-1} role="status" className="ui-recovery-page">{w.checkingSession}</main>
  if (!token) return <Navigate to="/login" replace />
  if (!files.length || !projectStatus) return <Navigate to="/localize" replace />
  if (step !== 'review' && (pipelineLoading || !resultsReady)) return <main id="main-content" tabIndex={-1} role="status" aria-busy="true" className="ui-recovery-page">
    <Loader2 className="mx-auto h-7 w-7 animate-spin text-brand-dark" aria-hidden="true" />
    <span className="mt-5 block">{t.loading}</span>
  </main>
  if (textless.length === 0 && step !== 'review') return null

  const activeFile = activeFileId ? textless.find(file => file.id === activeFileId) : undefined
  const activeSuggestion = activeFile ? suggestions[activeFile.id] : undefined
  const activeChoice = activeFile ? choices[activeFile.id] : undefined

  return <div className="min-h-screen bg-white">
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <SessionNotice />

      {step === 'detect' && <section>
        <h1 className="text-2xl font-extrabold sm:text-3xl">{t.bannerTitle.replace('{n}', String(textless.length))}</h1>
        <p className="mt-3 text-sm leading-6 text-sub">{t.bannerDesc}</p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {selectedFiles.map(file => {
            const hasCaption = (file.analysis?.regions.length ?? 0) > 0
            return <div key={file.id} className="rounded-panel border border-gray-200 bg-white p-3">
              <img src={file.url} alt={file.name} className="checkerboard aspect-square w-full rounded-lg object-contain" />
              <p className="mt-2 truncate text-xs text-sub" title={file.name}>{file.name}</p>
              <span className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${hasCaption ? 'bg-brand-soft text-brand-dark' : 'bg-amber-50 text-amber-700'}`}>
                {hasCaption ? t.hasCaption : t.noCaption}
              </span>
            </div>
          })}
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button variant="secondary" className="min-h-12 flex-1" onClick={() => navigate('/editor')}>{t.skip}</Button>
          <Button className="min-h-12 flex-1" onClick={startAnalysis}><Sparkles className="h-4 w-4" />{t.getSuggestions}</Button>
        </div>
      </section>}

      {step === 'analyze' && <section>
        <h1 className="text-2xl font-extrabold sm:text-3xl">{t.analyzeTitle}</h1>
        <p className="mt-2 text-sm text-sub">{t.analyzeSubtitle}</p>
        <div className="mt-6 grid gap-5 lg:grid-cols-[220px_1fr]">
          <div className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            {textless.map(file => {
              const done = Boolean(choices[file.id]?.text.trim())
              return <button key={file.id} type="button" onClick={() => setActiveFileId(file.id)}
                className={`flex shrink-0 items-center gap-2 rounded-lg border p-2 text-left text-xs font-bold lg:w-full ${activeFileId === file.id ? 'border-brand bg-brand-soft' : 'border-gray-200 bg-white'}`}>
                <img src={file.url} alt="" className="h-10 w-10 shrink-0 rounded object-contain" />
                <span className="min-w-0 truncate">{file.name}</span>
                <span className="ml-auto shrink-0 text-sub">{analyzing[file.id] ? t.analyzing : done ? <Check className="h-4 w-4 text-brand" /> : t.waiting}</span>
              </button>
            })}
          </div>
          <div className="rounded-panel border border-gray-200 p-5">
            {!activeFile ? null : analyzing[activeFile.id] ? (
              <div className="flex items-center gap-2 text-sm text-sub"><Loader2 className="h-4 w-4 animate-spin" />{t.analyzing}</div>
            ) : analyzeErrors[activeFile.id] ? (
              <div className="text-sm text-sub">{t.analyzeFailed}<Button variant="outline" className="ml-3" onClick={() => void fetchSuggestion(activeFile)}>{t.retry}</Button></div>
            ) : activeSuggestion ? (
              <div className="grid gap-5 sm:grid-cols-[1fr_1.2fr]">
                <div>
                  <div className="relative mx-auto aspect-square max-w-xs overflow-hidden rounded-lg border border-gray-200">
                    <img src={activeFile.url} alt={activeFile.name} className="checkerboard h-full w-full object-contain" />
                    {activeChoice?.text && <div className={`absolute inset-x-3 flex justify-center ${activeChoice.anchor === 'top' ? 'top-3' : 'bottom-3'}`}>
                      <span className="rounded-full bg-black/75 px-3 py-1 text-sm font-bold text-white">{activeChoice.text}</span>
                    </div>}
                  </div>
                </div>
                <div>
                  <h2 className="text-sm font-bold text-sub">{t.aiAnalysis}</h2>
                  <dl className="mt-2 space-y-1 text-sm">
                    <div><dt className="inline font-bold">{t.emotionLabel}: </dt><dd className="inline">{activeSuggestion.emotion}</dd></div>
                    <div><dt className="inline font-bold">{t.actionLabel}: </dt><dd className="inline">{activeSuggestion.action}</dd></div>
                    <div><dt className="inline font-bold">{t.situationLabel}: </dt><dd className="inline">{activeSuggestion.situations.join(', ')}</dd></div>
                  </dl>

                  <h2 className="mt-5 text-sm font-bold text-sub">{t.suggestedCaptions}</h2>
                  <div className="mt-2 space-y-2">
                    {activeSuggestion.candidates.map((candidate, index) => <button key={index} type="button"
                      onClick={() => setChoiceText(activeFile.id, candidate.text)}
                      className={`flex w-full items-center justify-between rounded-lg border p-2.5 text-left text-sm ${activeChoice?.text === candidate.text ? 'border-brand bg-brand-soft font-bold' : 'border-gray-200'}`}>
                      <span>{candidate.text}</span>
                      {candidate.best && <span className="rounded-full bg-brand px-2 py-0.5 text-xs font-bold text-white">{t.recommended}</span>}
                    </button>)}
                  </div>

                  <label className="mt-4 block text-sm font-bold text-sub">{t.customInput}</label>
                  <input type="text" maxLength={12} placeholder={t.customPlaceholder} value={activeChoice && !activeSuggestion.candidates.some(candidate => candidate.text === activeChoice.text) ? activeChoice.text : ''}
                    onChange={event => setChoiceText(activeFile.id, event.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />

                  <label className="mt-4 block text-sm font-bold text-sub">{t.position}</label>
                  <div className="mt-1 flex gap-2">
                    <Button variant={activeChoice?.anchor === 'top' ? 'primary' : 'outline'} size="sm" onClick={() => setChoiceAnchor(activeFile.id, 'top')}>{t.positionTop}</Button>
                    <Button variant={activeChoice?.anchor === 'bottom' ? 'primary' : 'outline'} size="sm" onClick={() => setChoiceAnchor(activeFile.id, 'bottom')}>{t.positionBottom}</Button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button variant="secondary" className="min-h-12 flex-1" onClick={() => setStep('detect')}><ArrowLeft className="h-4 w-4" />{t.backToDetect}</Button>
          <Button className="min-h-12 flex-1" disabled={!canReview} onClick={() => { setReviewFiles([...textless]); setStep('review') }}>{t.reviewAllAtOnce}</Button>
        </div>
      </section>}

      {step === 'review' && <section>
        <h1 className="text-2xl font-extrabold sm:text-3xl">{t.reviewTitle}</h1>
        <p className="mt-2 text-sm text-sub">{t.reviewSubtitle.replace('{n}', String(reviewItems.length))}</p>
        <div className="mt-6 space-y-3">
          {reviewPool.map(file => {
            const isRemoved = removed.has(file.id)
            const choice = choices[file.id]
            if (!choice?.text.trim() && !isRemoved) return null
            return <div key={file.id} className="flex items-center gap-3 rounded-panel border border-gray-200 p-3">
              <img src={file.url} alt={file.name} className="checkerboard h-14 w-14 shrink-0 rounded-lg object-contain" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold" title={file.name}>{file.name}</p>
                <p className="text-sm text-sub">{isRemoved ? t.removedNotice : choice?.text}</p>
                {applyResults[file.id] && <p role="status" className="mt-1 text-sm text-sub">{applyResults[file.id] === 'applied' ? t.applySuccess : applyResults[file.id] === 'pending' ? t.applyPending : t.applyError}</p>}
              </div>
              {isRemoved ? (
                <Button variant="outline" size="sm" disabled={applying} onClick={() => setRemoved(prev => { const next = new Set(prev); next.delete(file.id); return next })}><Undo2 className="h-4 w-4" />{t.undoRemove}</Button>
              ) : (
                <div className="flex shrink-0 gap-2">
                  <Button variant="outline" size="sm" disabled={applying || submitted.current.has(file.id)} onClick={() => { setStep('analyze'); setActiveFileId(file.id) }}>{t.changeCaption}</Button>
                  <Button variant="outline" size="sm" disabled={applying || submitted.current.has(file.id)} onClick={() => setRemoved(prev => new Set(prev).add(file.id))}><X className="h-4 w-4" />{t.removeCaption}</Button>
                </div>
              )}
            </div>
          })}
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button variant="secondary" className="min-h-12 flex-1" disabled={applying || submitted.current.size > 0} onClick={() => setStep('analyze')}><ArrowLeft className="h-4 w-4" />{t.backToAnalyze}</Button>
          {Object.keys(applyResults).length > 0 && <Button variant="outline" className="min-h-12 flex-1" disabled={applying} onClick={() => navigate('/editor')}>{t.openEditor}</Button>}
          <Button className="min-h-12 flex-1" disabled={applying} onClick={() => void handleApply()}>
            {applying ? <><Loader2 className="h-4 w-4 animate-spin" />{t.applying.replace('{done}', String(applyProgress.done)).replace('{total}', String(applyProgress.total))}</> : submitted.current.size > 0 ? t.checkStatus : t.applyAndContinue.replace('{n}', String(reviewItems.length))}
          </Button>
        </div>
      </section>}
    </main>
  </div>
}
