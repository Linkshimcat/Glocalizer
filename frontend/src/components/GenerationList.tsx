import { ArrowRight, Loader2, Pencil, Sparkles, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from './Button'
import Modal from './Modal'
import StickerThumbnail from './StickerThumbnail'
import { useToast } from './Toast'
import { useSiteLang } from '../i18n/LanguageContext'
import { generationCopy } from '../i18n/generation'
import { deleteGenerationProject, generationRequest, latestCompletedImages, renameGenerationProject, thumbnailImage, type GenerationProject } from '../lib/generationApi'
import { useAuth } from '../store/AuthContext'

function GenerationListSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} aria-busy="true" className="mt-4 grid gap-4">
      <span className="sr-only">{label}</span>
      {Array.from({ length: 1 }, (_, index) => (
        <div key={index} aria-hidden="true" className="flex animate-pulse flex-col gap-4 rounded-[24px] border border-gray-200/70 bg-white p-5 motion-reduce:animate-none sm:flex-row sm:items-center sm:p-6">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <div className="h-20 w-20 shrink-0 rounded-2xl bg-brand-soft/70" />
            <div className="min-w-0 flex-1">
              <div className="h-6 w-16 rounded-full bg-brand-soft" />
              <div className="mt-3 h-4 w-2/5 rounded-full bg-gray-200" />
              <div className="mt-3 h-3 w-1/3 rounded-full bg-gray-100" />
            </div>
          </div>
          <div className="h-11 w-full rounded-xl bg-brand-soft sm:w-28 sm:shrink-0" />
        </div>
      ))}
    </div>
  )
}

/** 대시보드·보관함에서 현지화 목록과 한 섹션에 나란히 놓인다. onCount를 받으면 제목과 빈
 *  상태를 부모가 책임지므로, 여기서는 카드만 그리고 보이는 개수만 올려보낸다. 불러오지
 *  못했을 때 null을 보내면 부모가 "작업 없음"으로 잘못 단정하지 않는다. */
export default function GenerationList({ archive = false, onCount }: { archive?: boolean; onCount?: (count: number | null) => void }) {
  const { token } = useAuth()
  const { t, lang } = useSiteLang()
  const g = generationCopy(lang)
  const navigate = useNavigate()
  const toast = useToast()
  const [projects, setProjects] = useState<GenerationProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<GenerationProject | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [renameTarget, setRenameTarget] = useState<GenerationProject | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renaming, setRenaming] = useState(false)

  useEffect(() => {
    let disposed = false
    setLoading(true)
    setError('')
    if (!token) { setLoading(false); return }
    generationRequest<{ projects: GenerationProject[] }>(token, '/projects')
      .then(result => { if (!disposed) setProjects(result.projects) })
      .catch(reason => { if (!disposed) setError(reason instanceof Error ? reason.message : 'API error') })
      .finally(() => { if (!disposed) setLoading(false) })
    return () => { disposed = true }
  }, [token])

  const visibleProjects = projects.filter(project => ((project.status ?? (latestCompletedImages(project).length === 24 ? 'completed' : 'active')) === 'completed') === archive)
  useEffect(() => { if (!loading) onCount?.(error ? null : visibleProjects.length) }, [loading, error, visibleProjects.length, onCount])

  const remove = async () => {
    if (!deleteTarget || !token) return
    setDeleting(true)
    try {
      await deleteGenerationProject(token, deleteTarget.id)
      setProjects(current => current.filter(project => project.id !== deleteTarget.id))
      setDeleteTarget(null)
      toast(t.cloudDeleteSuccess)
    } catch (reason) {
      toast(reason instanceof Error ? reason.message : t.cloudDeleteFailed)
    } finally {
      setDeleting(false)
    }
  }

  const rename = async () => {
    if (!renameTarget || !token) return
    setRenaming(true)
    try {
      const name = renameValue.trim().slice(0, 60)
      await renameGenerationProject(token, renameTarget.id, name)
      setProjects(current => current.map(project => project.id === renameTarget.id ? { ...project, name: name || null } : project))
      setRenameTarget(null)
      toast(t.cloudRenameSuccess)
    } catch (reason) {
      toast(reason instanceof Error ? reason.message : t.cloudRenameFailed)
    } finally {
      setRenaming(false)
    }
  }

  if (loading) return <GenerationListSkeleton label={g.loading} />
  if (error) return <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>
  if (!visibleProjects.length) return onCount ? null : <p className="mt-4 rounded-2xl border border-dashed border-gray-200 p-6 text-sm text-sub">{g.empty}</p>

  return <div className="mt-4 grid gap-4">
    {visibleProjects.map(project => {
      const completedImages = latestCompletedImages(project)
      const thumbnail = thumbnailImage(project)
      const pending = project.images.some(image => image.status === 'queued' || image.status === 'running')
      return <article key={project.id} className="flex min-w-0 flex-col gap-4 overflow-hidden rounded-[24px] border border-gray-200/70 bg-white p-5 sm:flex-row sm:items-center sm:p-6">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div className={`flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand-soft ${pending ? 'sticker-shimmer' : ''}`}>{thumbnail?.url ? <StickerThumbnail image={thumbnail} /> : <Sparkles className="h-7 w-7 text-brand-dark" />}</div>
          <div className="min-w-0">
            <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-bold text-brand-dark">{archive ? g.statusCompleted : pending ? g.aiWorking : g.statusActive}</span>
            <h3 className="mt-2 line-clamp-2 font-bold [overflow-wrap:anywhere]">{project.name || project.prompt}</h3>
            <p className="mt-1 text-sm text-sub">{completedImages.length}/24 {g.progress}</p>
            <p className="mt-1 text-xs text-sub">{project.day}</p>
          </div>
        </div>
        <div className="flex min-w-0 flex-wrap gap-2 sm:flex-nowrap sm:shrink-0">
          <Button variant="outline" aria-label={`${project.name || project.prompt} ${t.cloudRename}`} disabled={deleting || renaming} onClick={() => { setRenameTarget(project); setRenameValue(project.name ?? '') }} className="flex-1 sm:flex-none"><Pencil className="h-4 w-4" />{t.cloudRename}</Button>
          {!archive ? <Button variant="outline" aria-label={`${project.name || project.prompt} ${t.cloudDelete}`} disabled={deleting || renaming} onClick={() => setDeleteTarget(project)} className="flex-1 text-red-600 hover:bg-red-50 sm:flex-none"><Trash2 className="h-4 w-4" />{t.cloudDelete}</Button> : null}
          <Button onClick={() => navigate(`/generate?project=${project.id}`)} className="w-full sm:w-auto sm:flex-none"><ArrowRight className="h-4 w-4" />{archive ? t.cloudOpen : t.hubContinue}</Button>
        </div>
      </article>
    })}
    {deleteTarget ? <Modal onClose={() => { if (!deleting) setDeleteTarget(null) }} labelledBy="delete-generation-title" closeLabel={t.commonClose}>
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600"><Trash2 className="h-6 w-6" /></div>
      <h2 id="delete-generation-title" className="mt-5 pr-8 text-xl font-extrabold text-ink">{t.cloudDeleteTitle}</h2>
      <p className="mt-3 break-keep text-sm leading-6 text-sub">{t.cloudDeleteDescription.replace('{name}', deleteTarget.name || deleteTarget.prompt)}</p>
      <div className="mt-7 flex gap-3">
        <Button variant="secondary" disabled={deleting} onClick={() => setDeleteTarget(null)} className="flex-1">{t.cloudDeleteCancel}</Button>
        <Button disabled={deleting} onClick={() => { void remove() }} className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-100 disabled:text-red-400">
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}{t.cloudDeleteConfirm}
        </Button>
      </div>
    </Modal> : null}
    {renameTarget ? <Modal onClose={() => { if (!renaming) setRenameTarget(null) }} labelledBy="rename-generation-title" closeLabel={t.commonClose}>
      <h2 id="rename-generation-title" className="pr-8 text-xl font-extrabold text-ink">{t.cloudRenameTitle}</h2>
      <label htmlFor="rename-generation-input" className="mt-5 block text-sm font-bold">{t.cloudRenameLabel}</label>
      <input id="rename-generation-input" value={renameValue} maxLength={60} autoFocus disabled={renaming} placeholder={renameTarget.prompt.slice(0, 40)} onChange={event => setRenameValue(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !renaming) { void rename() } }} className="mt-2 w-full rounded-xl border border-gray-200 p-3 outline-none focus:ring-2 focus:ring-brand" />
      <p className="mt-2 text-xs leading-5 text-sub">{t.cloudRenameHint}</p>
      <div className="mt-6 flex gap-3">
        <Button variant="secondary" disabled={renaming} onClick={() => setRenameTarget(null)} className="flex-1">{t.cloudDeleteCancel}</Button>
        <Button disabled={renaming} onClick={() => { void rename() }} className="flex-1">{renaming ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{t.cloudRenameSave}</Button>
      </div>
    </Modal> : null}
  </div>
}
