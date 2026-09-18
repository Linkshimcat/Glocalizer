import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { useAuth } from '../store/AuthContext'
import { useSiteLang } from '../i18n/LanguageContext'
import { generationCopy } from '../i18n/generation'
import { generationRequest, type GenerationProject } from '../lib/generationApi'
export default function GenerationList({ archive = false }: { archive?: boolean }) {
  const { token, user } = useAuth()
  const { lang } = useSiteLang()
  const t = generationCopy(lang)
  const [projects, setProjects] = useState<GenerationProject[]>([])
  const [error, setError] = useState('')
  useEffect(() => {
    let disposed = false
    if (!token || user?.email?.toLowerCase() !== 'yunjae14278@naver.com') return
    generationRequest<{ projects: GenerationProject[] }>(token, '/projects').then(result => { if (!disposed) setProjects(result.projects) }).catch(e => { if (!disposed) setError(e instanceof Error ? e.message : 'API error') })
    return () => { disposed = true }
  }, [token, user?.email])
  if (user?.email?.toLowerCase() !== 'yunjae14278@naver.com') return null
  return <section className="mt-8"><h2 className="text-lg font-extrabold">{t.history}</h2>{error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}<div className="mt-3 grid gap-3 sm:grid-cols-2">{projects.filter(p => (new Set(p.images.filter(i => i.status === 'completed').map(i => i.slot)).size === 4) === archive).map(p => <Link key={p.id} to={`/generate?project=${p.id}`} className="flex min-w-0 items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4"><Sparkles className="shrink-0 text-brand-dark" /><span className="min-w-0"><span className="block truncate font-bold">{p.prompt}</span><span className="text-xs text-sub">{p.day} · {t.sample}</span></span></Link>)}</div></section>
}
