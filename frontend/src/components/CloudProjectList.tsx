import { ArrowRight, Globe2, Loader2, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from './Button'
import Modal from './Modal'
import { useToast } from './Toast'
import { useSiteLang } from '../i18n/LanguageContext'
import { deleteCloudProject, listCloudProjects, type CloudProject } from '../lib/api'
import { useAuth } from '../store/AuthContext'
import { LANGUAGES, useUploads } from '../store/uploads'

function ProjectListSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="mt-4 grid gap-4" aria-busy="true">
      <span className="sr-only">{label}</span>
      {Array.from({ length: 2 }, (_, index) => (
        <div
          key={index}
          aria-hidden="true"
          className="flex animate-pulse flex-col gap-4 rounded-[24px] border border-gray-200/70 bg-white p-5 sm:flex-row sm:items-center sm:p-6"
        >
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <div className="h-20 w-20 shrink-0 rounded-2xl bg-brand-soft/70" />
            <div className="min-w-0 flex-1">
              <div className="h-6 w-16 rounded-full bg-brand-soft" />
              <div className="mt-3 h-4 w-2/5 rounded-full bg-gray-200" />
              <div className="mt-3 h-3 w-3/5 rounded-full bg-gray-100" />
              <div className="mt-2 h-3 w-1/3 rounded-full bg-gray-100" />
            </div>
          </div>
          <div className="h-11 w-full rounded-xl bg-brand-soft sm:w-28 sm:shrink-0" />
        </div>
      ))}
    </div>
  )
}

/** onCount를 받으면 제목과 빈 상태를 부모가 책임진다. 생성 목록과 한 섹션에 나란히 놓일 때
 *  "작업 없음" 문구가 두 번 뜨지 않게 하기 위함이고, 불러오지 못했을 때는 null을 올려보내
 *  부모가 작업이 없다고 잘못 단정하지 않게 한다. */
export default function CloudProjectList({ archive, onCount }: { archive: boolean; onCount?: (count: number | null) => void }) {
  const { user, token } = useAuth()
  const { t, lang } = useSiteLang()
  const { openCloudProject, resultReady, cloudSaving, flushCloudWork, projectStatus, resetWorkflow } = useUploads()
  const navigate = useNavigate()
  const toast = useToast()
  const [projects, setProjects] = useState<CloudProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [retry, setRetry] = useState(0)
  const [opening, setOpening] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CloudProject | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let active = true
    setProjects([])
    setLoading(true)
    setError(false)
    if (!user || !token) { setLoading(false); return }
    listCloudProjects().then(result => { if (active) setProjects(result.projects.filter(project => project.imageCount > 0 && project.resultReady === archive)) })
      .catch(() => { if (active) setError(true) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [user, token, archive, retry, resultReady, cloudSaving])

  useEffect(() => { if (!loading) onCount?.(error ? null : projects.length) }, [loading, error, projects.length, onCount])

  const open = async (id: string) => {
    setOpening(id)
    try { await flushCloudWork(); navigate(await openCloudProject(id)) }
    catch (err) { toast(err instanceof Error ? err.message : t.cloudListFailed) }
    finally { setOpening(null) }
  }

  const remove = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteCloudProject(deleteTarget.id)
      setProjects(current => current.filter(project => project.id !== deleteTarget.id))
      if (projectStatus?.projectId === deleteTarget.id) resetWorkflow()
      setDeleteTarget(null)
      toast(t.cloudDeleteSuccess)
    } catch (err) {
      toast(err instanceof Error ? err.message : t.cloudDeleteFailed)
    } finally {
      setDeleting(false)
    }
  }

  if (!user) return <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-5"><p className="text-sm text-sub">{t.cloudLogin}</p><Button className="mt-3" onClick={() => navigate('/login')}>{t.navLogin}</Button></div>
  if (loading) return <ProjectListSkeleton label={t.cloudLoading} />
  if (error) return <div role="alert" className="mt-5"><p className="text-sm text-sub">{t.cloudListFailed}</p><Button variant="outline" className="mt-3" onClick={() => setRetry(value => value + 1)}>{t.cloudRetry}</Button></div>
  if (!projects.length) return onCount ? null : <p className="mt-5 rounded-2xl border border-dashed border-gray-200 p-6 text-sm text-sub">{archive ? t.cloudEmptyArchive : t.cloudEmptyProgress}</p>

  return <div className="mt-4 grid gap-4">
    {projects.map(project => {
      const status = project.resultReady ? t.hubResult : project.status === 'created' ? t.hubUpload : project.status === 'processing' ? t.hubProcessing : project.status === 'failed' ? t.hubFailed : t.hubEditing
      return <article key={project.id} className="flex min-w-0 flex-col gap-4 overflow-hidden rounded-[24px] border border-gray-200/70 bg-white p-5 sm:flex-row sm:items-center sm:p-6">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-surface">{project.thumbnailUrl ? <img src={project.thumbnailUrl} alt="" className="h-full w-full object-contain" /> : <Globe2 className="h-7 w-7 text-sub" />}</div>
          <div className="min-w-0">
            <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-bold text-brand-dark">{status}</span>
            <h3 className="mt-2 line-clamp-2 font-bold [overflow-wrap:anywhere]">{project.name}</h3>
            <p className="mt-1 break-words text-sm text-sub">{t.hubFiles.replace('{n}', String(project.imageCount))}{project.targetLanguages.length > 0 && ` · ${LANGUAGES.filter(language => project.targetLanguages.includes(language.code)).map(language => language.label).join(' · ')}`}</p>
            <p className="mt-1 text-xs text-sub">{t.cloudRecent} · {new Date(project.updatedAt).toLocaleDateString(lang)}</p>
          </div>
        </div>
        <div className="flex min-w-0 gap-2 sm:shrink-0">
          {!archive ? <Button variant="outline" aria-label={`${project.name} ${t.cloudDelete}`} disabled={opening !== null || cloudSaving} onClick={() => setDeleteTarget(project)} className="text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" />{t.cloudDelete}</Button> : null}
          <Button disabled={opening !== null || cloudSaving} onClick={() => { void open(project.id) }} className="flex-1 sm:flex-none">{opening === project.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}{archive ? t.cloudOpen : t.hubContinue}</Button>
        </div>
      </article>
    })}
    {deleteTarget ? <Modal onClose={() => { if (!deleting) setDeleteTarget(null) }} labelledBy="delete-project-title" closeLabel={t.commonClose}>
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600"><Trash2 className="h-6 w-6" /></div>
      <h2 id="delete-project-title" className="mt-5 pr-8 text-xl font-extrabold text-ink">{t.cloudDeleteTitle}</h2>
      <p className="mt-3 break-keep text-sm leading-6 text-sub">{t.cloudDeleteDescription.replace('{name}', deleteTarget.name)}</p>
      <div className="mt-7 flex gap-3">
        <Button variant="secondary" disabled={deleting} onClick={() => setDeleteTarget(null)} className="flex-1">{t.cloudDeleteCancel}</Button>
        <Button disabled={deleting} onClick={() => { void remove() }} className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-100 disabled:text-red-400">
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}{t.cloudDeleteConfirm}
        </Button>
      </div>
    </Modal> : null}
  </div>
}
