import { AlertTriangle, ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, Download, Home } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Modal from '../components/Modal'
import PngPreview from '../components/PngPreview'
import AILocalizationBadge from '../components/AILocalizationBadge'
import UploadSpecBadge from '../components/UploadSpecBadge'
import { useToast } from '../components/Toast'
import { toDemoItems } from '../data/demo'
import { downloadBlob, exportFileName, imageStyleForItem, renderItemToPng, textOverlaysForItem, zipLocalizedItems } from '../lib/exportImage'
import { useUploads } from '../store/uploads'
import { useSiteLang } from '../i18n/LanguageContext'
import { workflowCopy } from '../i18n/workflow'

export default function Result() {
  const navigate = useNavigate()
  const toast = useToast()
  const { t, lang } = useSiteLang()
  const w = workflowCopy[lang]
  const { files, targetLangs, styles, resetWorkflow, projectStatus, resultReady, cloudSaving, flushCloudWork, selectedFileIds, outputPreset, recordDownload, lastDownload } = useUploads()
  const [enlarged, setEnlarged] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const exporting = useRef(false)
  const groups = useMemo(() => {
    const languages = targetLangs.length ? targetLangs : [{ code: 'en', flag: '🇺🇸', label: 'English' }]
    return languages.map(language => ({ language, items: toDemoItems(files.filter(file => selectedFileIds.includes(file.id)), language.code) }))
  }, [files, selectedFileIds, targetLangs])
  const entries = useMemo(() => groups.flatMap(group => group.items.map(item => ({ item, language: group.language }))), [groups])
  // 실사용 피드백(W5/W6): 일부 항목이 실패했거나 수동 보정이 필요할 때도 화면 상단은 항상 "준비됐어요"로만
  // 보여 완료 여부를 체감하기 어렵다는 제보가 있었다. 두 신호를 상단 배너에 그대로 드러낸다.
  const failedCount = projectStatus?.assets.filter(asset => asset.status === 'failed').length ?? 0
  const manualCleanupCount = useMemo(
    () => new Set(entries.filter(({ item }) => item.analysis?.needsManualCleanup).map(({ item }) => item.id)).size,
    [entries],
  )
  const active = enlarged === null ? undefined : entries[enlarged]
  useEffect(() => {
    if (enlarged === null) return
    const handle = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') setEnlarged(value => Math.max(0, (value ?? 0) - 1))
      if (event.key === 'ArrowRight') setEnlarged(value => Math.min(entries.length - 1, (value ?? 0) + 1))
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [enlarged, entries.length])
  const redownload = async (entry?: typeof entries[number]) => {
    if (exporting.current) return
    exporting.current = true
    setBusy(true)
    try {
      await flushCloudWork()
      if (entry) {
        const { item, language } = entry
        const blob = await renderItemToPng(item, imageStyleForItem(item, language.code, styles), textOverlaysForItem(item, language.code, styles), outputPreset)
        downloadBlob(blob, exportFileName(item.name, language.code, 'png'))
        recordDownload('single', language.code)
      } else {
        const blob = await zipLocalizedItems(groups.map(group => ({ languageCode: group.language.code, items: group.items })), styles, outputPreset)
        downloadBlob(blob, 'glocalizer_export.zip')
        recordDownload('zip')
      }
      toast(w.downloadStarted, 'success')
    } catch (error) { toast(error instanceof Error ? error.message : t.toastDownloadFail) }
    finally { exporting.current = false; setBusy(false) }
  }
  if (cloudSaving && files.length === 0) return <div role="status" className="p-8 text-center text-sub">{t.cloudLoading}</div>
  if (!files.length || !projectStatus) return <Navigate to="/localize" replace />
  if (!['completed', 'failed'].includes(projectStatus.status) || !resultReady) return <Navigate to="/editor" replace />

  return <div className="studio-result min-h-screen bg-white">
    <div className="workspace-stepbar"><div className="layout-app text-sm font-bold text-brand-dark">3 · {t.stepDownload}</div></div>
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <section className="studio-result-summary"><div>
        <div className="flex items-center gap-2.5">
          {!lastDownload && (failedCount > 0
            ? <AlertTriangle aria-hidden className="h-7 w-7 shrink-0 text-amber-500" />
            : <CheckCircle2 aria-hidden className="h-7 w-7 shrink-0 text-brand" />)}
          <h1 className="text-2xl font-extrabold sm:text-3xl">{lastDownload ? w.downloadStarted : failedCount > 0 ? w.readyWithFailures.replace('{n}', String(failedCount)) : w.ready}</h1>
        </div>
        <p role="status" aria-live="polite" className="mt-3 text-sm text-sub">{busy ? w.preparing : lastDownload ? w.downloadHint : manualCleanupCount > 0 ? w.previewHintManual.replace('{n}', String(manualCleanupCount)) : w.previewHint}</p>
        </div><Button className="w-full shrink-0 sm:w-auto" disabled={busy || !entries.length} onClick={() => { void redownload() }}><Download className="h-4 w-4" />{w.downloadAgain} · ZIP</Button>
      </section>
      <section className="mt-8">
        <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-bold">{t.resultPreviewTitle}</h2><AILocalizationBadge /><UploadSpecBadge /></div>
        <div className="mt-5 space-y-8">{groups.map(({ language, items }) => <section key={language.code}>
          <h3 className="font-bold">{language.flag} {language.label}</h3>
          {/* 미리보기가 작다는 실사용 피드백(W5/W6)을 반영해 열 수를 줄이고 카드를 키웠다(기존 2/3/4열 → 2/3열). */}
          <div className="studio-result-gallery mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3">{items.map(item => <article key={item.id} className="min-w-0 rounded-2xl border border-gray-200 bg-white p-3">
            <PngPreview item={item} overlays={textOverlaysForItem(item, language.code, styles)} baseStyle={imageStyleForItem(item, language.code, styles)} preset={outputPreset} onEnlarge={() => setEnlarged(entries.findIndex(entry => entry.item.id === item.id && entry.language.code === language.code))} />
            <p className="mt-2 truncate text-xs text-sub" title={item.name}>{item.name}</p>
            {item.analysis?.needsManualCleanup && <button type="button" className="mt-2 flex w-full items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 p-2 text-left text-xs font-bold text-amber-900" onClick={() => navigate(`/editor?cleanup=${encodeURIComponent(item.id)}`)}><AlertTriangle aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />{w.cleanupAction}</button>}
          </article>)}</div>
        </section>)}</div>
      </section>
      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Button variant="secondary" className="min-h-12 flex-1" onClick={() => navigate('/editor')}><ArrowLeft className="h-4 w-4" />{t.resultBackEditor}</Button>
        <Button variant="secondary" className="min-h-12 flex-1" onClick={() => navigate('/dashboard')}><Home className="h-4 w-4" />{t.hubDashboard}</Button>
        <Button className="min-h-12 flex-1" onClick={async () => { try { await flushCloudWork(); resetWorkflow(); navigate('/localize') } catch (error) { toast(error instanceof Error ? error.message : t.cloudSaveFailed) } }}>{t.resultRestart}</Button>
      </div>
    </main>
    {active && enlarged !== null && <Modal onClose={() => setEnlarged(null)} closeLabel={w.close} labelledBy="result-preview-title" className="max-w-4xl">
      <h2 id="result-preview-title" className="break-words pr-8 font-bold">{active.language.flag} {active.item.name} · {enlarged + 1}/{entries.length}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div><p className="mb-2 text-sm text-sub">{t.stepUpload}</p><img src={active.item.analysis?.originalUrl ?? active.item.url} alt={active.item.name} className="checkerboard max-h-[60dvh] w-full rounded-panel object-contain" /></div>
        <div><p className="mb-2 text-sm text-sub">{w.preview}</p><PngPreview large item={active.item} overlays={textOverlaysForItem(active.item, active.language.code, styles)} baseStyle={imageStyleForItem(active.item, active.language.code, styles)} preset={outputPreset} /></div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <Button variant="outline" aria-label={w.previous} disabled={enlarged === 0} onClick={() => setEnlarged(enlarged - 1)}><ChevronLeft className="h-4 w-4" />{w.previous}</Button>
        <Button disabled={busy} onClick={() => { void redownload(active) }}><Download className="h-4 w-4" />PNG</Button>
        <Button variant="outline" aria-label={w.next} disabled={enlarged === entries.length - 1} onClick={() => setEnlarged(enlarged + 1)}>{w.next}<ChevronRight className="h-4 w-4" /></Button>
      </div>
    </Modal>}
  </div>
}
