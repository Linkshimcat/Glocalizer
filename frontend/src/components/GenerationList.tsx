import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { useAuth } from '../store/AuthContext'
import { useSiteLang } from '../i18n/LanguageContext'
import { generationCopy } from '../i18n/generation'
import { generationRequest, latestCompletedImages, type GenerationProject } from '../lib/generationApi'

function GenerationListSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} aria-busy="true" className="mt-3 grid gap-3 sm:grid-cols-2">
      <span className="sr-only">{label}</span>
      {Array.from({ length: 2 }, (_, index) => (
        <div key={index} aria-hidden="true" className="flex animate-pulse items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 motion-reduce:animate-none">
          <div className="h-16 w-16 shrink-0 rounded-xl bg-brand-soft" />
          <div className="min-w-0 flex-1"><div className="h-4 w-3/5 rounded-full bg-gray-200" /><div className="mt-3 h-3 w-2/5 rounded-full bg-gray-100" /></div>
        </div>
      ))}
    </div>
  )
}

export default function GenerationList({ archive = false }: { archive?: boolean }) {
  const { token } = useAuth()
  const { lang } = useSiteLang()
  const t = generationCopy(lang)
  const [projects, setProjects] = useState<GenerationProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    let disposed = false
    setLoading(true)
    setError('')
    if (!token) { setLoading(false); return }
    generationRequest<{ projects: GenerationProject[] }>(token, '/projects')
      .then(result => { if (!disposed) setProjects(result.projects) })
      .catch(e => { if (!disposed) setError(e instanceof Error ? e.message : 'API error') })
      .finally(() => { if (!disposed) setLoading(false) })
    return () => { disposed = true }
  }, [token])
  const visibleProjects = projects.filter(project => ((project.status ?? (latestCompletedImages(project).length === 24 ? 'completed' : 'active')) === 'completed') === archive)

  return <section className="mt-8">
    <h2 className="text-lg font-extrabold">{t.history}</h2>
    {loading ? <GenerationListSkeleton label={t.loading} /> : null}
    {error ? <p role="alert" className="mt-3 text-sm text-red-600">{error}</p> : null}
    {!loading && !error && visibleProjects.length === 0 ? <p className="mt-3 rounded-2xl border border-dashed border-gray-200 p-5 text-sm text-sub">{t.empty}</p> : null}
    {!loading && !error ? <div className="mt-3 grid gap-3 sm:grid-cols-2">{visibleProjects.map(project => {
      const completedImages = latestCompletedImages(project)
      const thumbnail = completedImages[0]
      return <Link key={project.id} to={`/generate?project=${project.id}`} className="flex min-w-0 items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 transition-colors hover:border-brand/50">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-soft">{thumbnail?.url ? <img src={thumbnail.url} alt="" loading="lazy" className="h-full w-full object-contain" /> : <Sparkles className="text-brand-dark" />}</span>
        <span className="min-w-0"><span className="block truncate font-bold">{project.prompt}</span><span className="text-xs text-sub">{project.day} · {completedImages.length}/24 · {archive ? t.statusCompleted : t.statusActive}</span></span>
      </Link>
    })}</div> : null}
  </section>
}
