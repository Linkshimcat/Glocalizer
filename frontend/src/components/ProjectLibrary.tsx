import { requestErrorMessage } from '../lib/requestError'
import { ArrowRight, Globe2, Loader2, Pencil, RefreshCw, Search, Sparkles, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { deleteCloudProject, listCloudProjects, renameCloudProject, type CloudProject } from '../lib/api'
import { deleteGenerationProject, generationRequest, renameGenerationProject, thumbnailImage, type GenerationProject } from '../lib/generationApi'
import { filterProjects, libraryProjects, type LibraryProject } from '../lib/projectLibrary'
import { experienceCopy } from '../i18n/experience'
import { useSiteLang } from '../i18n/LanguageContext'
import { useAuth } from '../store/AuthContext'
import { LANGUAGES, useUploads } from '../store/uploads'
import Button from './Button'
import Modal from './Modal'
import StateNotice from './StateNotice'
import StickerThumbnail from './StickerThumbnail'
import { useToast } from './Toast'

const kinds = ['all', 'localization', 'generation'] as const
const statuses = ['all', 'draft', 'running', 'editing', 'completed', 'attention'] as const
const sorts = ['newest', 'oldest', 'name'] as const

export default function ProjectLibrary({ archive = false, loginMessage }: { archive?: boolean; loginMessage?: string }) {
  const { user, token, checkingSession } = useAuth()
  const { t, lang } = useSiteLang()
  const copy = experienceCopy[lang]
  const { openCloudProject, flushCloudWork, resetWorkflow, projectStatus, resultReady } = useUploads()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const toast = useToast()
  const [localized, setLocalized] = useState<CloudProject[]>([])
  const [generated, setGenerated] = useState<GenerationProject[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState<string[]>([])
  const [refresh, setRefresh] = useState(0)
  const [opening, setOpening] = useState<string | null>(null)
  const [target, setTarget] = useState<{ project: LibraryProject; action: 'rename' | 'delete' } | null>(null)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const mutationLock = useRef(false)
  const userId = user?.id
  const authRef = useRef(token)
  authRef.current = token

  const q = params.get('q') ?? ''
  const kind = kinds.find(value => value === params.get('kind')) ?? 'all'
  const status = statuses.find(value => value === params.get('status')) ?? 'all'
  const sort = sorts.find(value => value === params.get('sort')) ?? 'newest'
  const hasFilters = Boolean(q || kind !== 'all' || status !== 'all' || sort !== 'newest')
  const setFilter = (key: string, value: string) => {
    setParams(current => {
      const next = new URLSearchParams(current)
      if (!value || value === 'all' || (key === 'sort' && value === 'newest')) next.delete(key)
      else next.set(key, value)
      return next
    }, { replace: true })
  }
  const clearFilters = () => setParams(current => {
    const next = new URLSearchParams(current)
    for (const key of ['q', 'kind', 'status', 'sort']) next.delete(key)
    return next
  }, { replace: true })

  useEffect(() => {
    let active = true
    setFailed([])
    if (!token || !userId) { setLocalized([]); setGenerated([]); setLoading(false); return }
    setLoading(true)
    void Promise.allSettled([listCloudProjects(), generationRequest<{ projects: GenerationProject[] }>(token, '/projects')])
      .then(([cloud, generation]) => {
        if (!active) return
        setLocalized(cloud.status === 'fulfilled' ? cloud.value.projects : [])
        setGenerated(generation.status === 'fulfilled' ? generation.value.projects : [])
        setFailed([...(cloud.status === 'rejected' ? ['localization'] : []), ...(generation.status === 'rejected' ? ['generation'] : [])])
      }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [token, userId, refresh, resultReady, projectStatus?.projectId, projectStatus?.status])

  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') setRefresh(value => value + 1) }
    window.addEventListener('focus', onVisible)
    document.addEventListener('visibilitychange', onVisible)
    return () => { window.removeEventListener('focus', onVisible); document.removeEventListener('visibilitychange', onVisible) }
  }, [])

  useEffect(() => { setTarget(null); setName('') }, [token, userId])

  const projects = libraryProjects(localized, generated)
  const visible = filterProjects(projects, { archive, q, kind, status, sort }, lang)
  const running = projects.filter(project => !project.archived && project.status === 'running').length
  const busy = saving || opening !== null

  // Read-only polling follows running jobs without repeating any creation requests.
  useEffect(() => {
    if (!token || running === 0) return
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') setRefresh(value => value + 1)
    }, 10000)
    return () => window.clearInterval(interval)
  }, [token, running])

  const open = async (project: LibraryProject) => {
    if (mutationLock.current) return
    mutationLock.current = true
    setOpening(project.key)
    try {
      await flushCloudWork()
      if (authRef.current !== token) return
      navigate(project.kind === 'localization' ? await openCloudProject(project.id) : `/generate?project=${encodeURIComponent(project.id)}`)
    } catch (error) { toast(requestErrorMessage(error, lang, t.cloudListFailed)) }
    finally { mutationLock.current = false; setOpening(null) }
  }

  const mutate = async () => {
    if (!target || !token || mutationLock.current) return
    mutationLock.current = true
    setSaving(true)
    const { project, action } = target
    try {
      await flushCloudWork()
      if (authRef.current !== token) return
      if (action === 'delete') {
        if (project.kind === 'localization') {
          await deleteCloudProject(project.id)
          if (authRef.current !== token) return
          setLocalized(current => current.filter(item => item.id !== project.id))
          if (projectStatus?.projectId === project.id) resetWorkflow()
        } else {
          await deleteGenerationProject(token, project.id)
          if (authRef.current !== token) return
          setGenerated(current => current.filter(item => item.id !== project.id))
        }
      } else {
        const nextName = name.trim().slice(0, 60)
        if (project.kind === 'localization') {
          await renameCloudProject(project.id, nextName)
          if (authRef.current !== token) return
          setLocalized(current => current.map(item => item.id === project.id ? { ...item, name: nextName } : item))
        } else {
          await renameGenerationProject(token, project.id, nextName)
          if (authRef.current !== token) return
          setGenerated(current => current.map(item => item.id === project.id ? { ...item, name: nextName || null } : item))
        }
      }
      setTarget(null)
      setRefresh(value => value + 1)
      toast(action === 'delete' ? t.cloudDeleteSuccess : t.cloudRenameSuccess, 'success')
    } catch (error) { toast(requestErrorMessage(error, lang, action === 'delete' ? t.cloudDeleteFailed : t.cloudRenameFailed)) }
    finally { mutationLock.current = false; setSaving(false) }
  }

  if (!token || !user) return <StateNotice className="mt-5" action={!checkingSession && <Link className="ui-link" to={`/login?next=${archive ? '/archive' : '/dashboard'}`}>{t.navLogin}</Link>}>{checkingSession ? t.cloudLoading : loginMessage ?? t.cloudLogin}</StateNotice>

  return <div className="project-library">
    <div className="project-library-controls">
      <label className="project-library-search"><span>{copy.search}</span><div className="relative"><Search className="absolute left-3 top-3.5 text-sub" size={18} aria-hidden="true" /><input type="search" value={q} placeholder={copy.searchHint} onChange={event => setFilter('q', event.target.value)} className="ui-input pl-10" /></div></label>
      <label><span>{copy.kind}</span><select aria-label={copy.kind} className="ui-input" value={kind} onChange={event => setFilter('kind', event.target.value)}>{kinds.map(value => <option key={value} value={value}>{copy[value]}</option>)}</select></label>
      <label><span>{copy.status}</span><select aria-label={copy.status} className="ui-input" value={status} onChange={event => setFilter('status', event.target.value)}>{statuses.map(value => <option key={value} value={value}>{copy[value]}</option>)}</select></label>
      <label><span>{copy.sort}</span><select aria-label={copy.sort} className="ui-input" value={sort} onChange={event => setFilter('sort', event.target.value)}>{sorts.map(value => <option key={value} value={value}>{copy[value]}</option>)}</select></label>
      <Button variant="outline" disabled={loading || busy} onClick={() => setRefresh(value => value + 1)}><RefreshCw size={16} className={loading ? 'animate-spin' : ''} aria-hidden="true" />{copy.refresh}</Button>
    </div>
    {failed.length > 0 && <StateNotice error className="mt-4" action={<Button variant="outline" disabled={loading} onClick={() => setRefresh(value => value + 1)}>{copy.retry}</Button>}><p>{failed.length === 2 ? t.cloudListFailed : copy.partialFailure}</p><p className="mt-1 text-sm text-sub">{failed.map(value => copy[value as 'localization' | 'generation']).join(' · ')}</p></StateNotice>}
    <div className="project-library-summary" role="status" aria-live="polite"><span>{loading ? t.cloudLoading : copy.results.replace('{n}', String(visible.length))}</span>{!archive && running > 0 && <span>{copy.inProgress.replace('{n}', String(running))}</span>}{hasFilters && <button type="button" className="ui-link" onClick={clearFilters}>{copy.reset}</button>}</div>
    {loading && projects.length === 0 ? <div role="status" aria-label={t.cloudLoading} aria-busy="true" className="project-library-grid">{[0, 1, 2].map(index => <div key={index} aria-hidden="true" className="project-library-skeleton motion-reduce:animate-none" />)}</div> : <>
      {!visible.length && failed.length !== 2 && <div className="project-library-empty"><p>{hasFilters ? copy.noMatches : archive ? t.cloudEmptyArchive : t.cloudEmptyProgress}</p><Button variant="outline" className="mt-4" onClick={hasFilters ? clearFilters : () => navigate('/localize')}>{hasFilters ? copy.reset : t.hubStart}</Button></div>}
      <div className="project-library-grid">{visible.map(project => {
        const cloud = project.kind === 'localization' ? project.source as CloudProject : null
        const generatedProject = project.kind === 'generation' ? project.source as GenerationProject : null
        const thumbnail = generatedProject ? thumbnailImage(generatedProject) : null
        const Icon = cloud ? Globe2 : Sparkles
        return <article key={project.key} data-project-key={project.key} className="project-library-card">
          <button type="button" className="project-library-preview" aria-label={`${project.name} ${t.cloudOpen}`} disabled={busy} onClick={() => { void open(project) }}>{cloud?.thumbnailUrl ? <img src={cloud.thumbnailUrl} alt="" loading="lazy" decoding="async" /> : thumbnail?.url ? <StickerThumbnail image={thumbnail} /> : <Icon size={28} aria-hidden="true" />}</button>
          <div className="project-library-info"><p className="text-xs text-sub">{copy[project.kind]}</p><h3 title={project.name}>{project.name}</h3><p className="project-library-status" data-state={project.needsAttention ? 'attention' : project.status}>{copy[project.status]}{project.needsAttention && project.status !== 'attention' ? ` · ${copy.attention}` : ''}</p><p className="text-sm text-sub">{cloud ? t.hubFiles.replace('{n}', String(project.imageCount)) : `${project.imageCount}/24`}{cloud && cloud.targetLanguages.length ? ` · ${LANGUAGES.filter(item => cloud.targetLanguages.includes(item.code)).map(item => item.label).join(' · ')}` : ''}</p><p className="text-xs text-sub">{copy.latest} · {new Date(project.createdAt).toLocaleDateString(lang)}</p></div>
          <div className="project-library-actions"><Button disabled={busy} onClick={() => { void open(project) }}>{opening === project.key ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} aria-hidden="true" />}{archive ? t.cloudOpen : t.hubContinue}</Button><details><summary aria-label={`${project.name} ${copy.details}`}>{copy.details}</summary><div><Button variant="ghost" disabled={busy} onClick={() => { setTarget({ project, action: 'rename' }); setName(project.kind === 'generation' ? (project.source as GenerationProject).name ?? '' : project.name) }}><Pencil size={16} aria-hidden="true" />{t.cloudRename}</Button><Button variant="ghost" disabled={busy} onClick={() => setTarget({ project, action: 'delete' })}><Trash2 size={16} aria-hidden="true" />{t.cloudDelete}</Button></div></details></div>
        </article>
      })}</div>
    </>}
    {target && <Modal onClose={() => { if (!saving) setTarget(null) }} labelledBy="library-dialog-title" closeLabel={t.commonClose}>
      <h2 id="library-dialog-title" className="pr-8 text-xl font-bold">{target.action === 'delete' ? t.cloudDeleteTitle : t.cloudRenameTitle}</h2>
      {target.action === 'delete' ? <p className="mt-4 text-sm leading-6 text-sub">{t.cloudDeleteDescription.replace('{name}', target.project.name)}</p> : <><label htmlFor="library-name" className="mt-5 block text-sm font-bold">{t.cloudRenameLabel}</label><input id="library-name" autoFocus maxLength={60} disabled={saving} value={name} onChange={event => setName(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); void mutate() } }} className="ui-input mt-2" /><p className="mt-2 text-sm text-sub">{t.cloudRenameHint}</p></>}
      <div className="mt-6 flex gap-3"><Button variant="secondary" className="flex-1" disabled={saving} onClick={() => setTarget(null)}>{t.cloudDeleteCancel}</Button><Button variant={target.action === 'delete' ? 'danger' : 'primary'} className="flex-1" disabled={saving} onClick={() => { void mutate() }}>{saving && <Loader2 size={16} className="animate-spin" />}{target.action === 'delete' ? t.cloudDeleteConfirm : t.cloudRenameSave}</Button></div>
    </Modal>}
  </div>
}
