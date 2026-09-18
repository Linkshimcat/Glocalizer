import { ArrowRight, Globe2, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from './Button'
import { useToast } from './Toast'
import { useSiteLang } from '../i18n/LanguageContext'
import { listCloudProjects, type CloudProject } from '../lib/api'
import { useAuth } from '../store/AuthContext'
import { LANGUAGES, useUploads } from '../store/uploads'

export default function CloudProjectList({ archive }: { archive: boolean }) {
  const { user, token } = useAuth()
  const { t, lang } = useSiteLang()
  const { openCloudProject, resultReady, cloudSaving, flushCloudWork } = useUploads()
  const navigate = useNavigate()
  const toast = useToast()
  const [projects, setProjects] = useState<CloudProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [retry, setRetry] = useState(0)
  const [opening, setOpening] = useState<string | null>(null)

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

  const open = async (id: string) => {
    setOpening(id)
    try { await flushCloudWork(); navigate(await openCloudProject(id)) }
    catch (err) { toast(err instanceof Error ? err.message : t.cloudListFailed) }
    finally { setOpening(null) }
  }

  if (!user) return <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-5"><p className="text-sm text-sub">{t.cloudLogin}</p><Button className="mt-3" onClick={() => navigate('/login')}>{t.navLogin}</Button></div>
  if (loading) return <p role="status" className="mt-5 flex items-center gap-2 text-sm text-sub"><Loader2 className="h-4 w-4 animate-spin" />{t.cloudLoading}</p>
  if (error) return <div role="alert" className="mt-5"><p className="text-sm text-sub">{t.cloudListFailed}</p><Button variant="outline" className="mt-3" onClick={() => setRetry(value => value + 1)}>{t.cloudRetry}</Button></div>
  if (!projects.length) return <p className="mt-5 rounded-2xl border border-dashed border-gray-200 p-6 text-sm text-sub">{archive ? t.cloudEmptyArchive : t.cloudEmptyProgress}</p>

  return <div className="mt-4 grid gap-4">
    {projects.map(project => {
      const status = project.resultReady ? t.hubResult : project.status === 'created' ? t.hubUpload : project.status === 'processing' ? t.hubProcessing : project.status === 'failed' ? t.hubFailed : t.hubEditing
      return <article key={project.id} className="flex flex-col gap-4 rounded-[24px] border border-gray-200/70 bg-white p-5 sm:flex-row sm:items-center sm:p-6">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-surface">{project.thumbnailUrl ? <img src={project.thumbnailUrl} alt="" className="h-full w-full object-contain" /> : <Globe2 className="h-7 w-7 text-sub" />}</div>
          <div className="min-w-0">
            <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-bold text-brand-dark">{status}</span>
            <h3 className="mt-2 truncate font-bold">{project.name}</h3>
            <p className="mt-1 break-words text-sm text-sub">{t.hubFiles.replace('{n}', String(project.imageCount))}{project.targetLanguages.length > 0 && ` · ${LANGUAGES.filter(language => project.targetLanguages.includes(language.code)).map(language => language.label).join(' · ')}`}</p>
            <p className="mt-1 text-xs text-sub">{t.cloudRecent} · {new Date(project.updatedAt).toLocaleDateString(lang)}</p>
          </div>
        </div>
        <Button disabled={opening !== null || cloudSaving} onClick={() => { void open(project.id) }}>{opening === project.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}{archive ? t.cloudOpen : t.hubContinue}</Button>
      </article>
    })}
  </div>
}
