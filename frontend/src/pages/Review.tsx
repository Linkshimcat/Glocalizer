import { CheckCircle2, Loader2, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Header from '../components/Header'
import { useSiteLang } from '../i18n/LanguageContext'
import {
  fetchOgqStickers,
  listCloudProjects,
  restoreCloudProject,
  type CloudProject,
  type OgqSticker,
} from '../lib/api'
import { useAuth } from '../store/AuthContext'

// 프로젝트 하나에 캡션이 아무리 많아도, 검색 요청 수를 합리적인 범위로 제한한다.
const MAX_KEYWORDS = 5
const STICKERS_PER_KEYWORD = 6

interface KeywordResult {
  keyword: string
  stickers: OgqSticker[]
  failed: boolean
}

export default function Review() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { t, lang } = useSiteLang()

  const [projects, setProjects] = useState<CloudProject[] | null>(null)
  const [projectsFailed, setProjectsFailed] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loadingWorkspace, setLoadingWorkspace] = useState(false)
  const [workspaceFailed, setWorkspaceFailed] = useState(false)
  const [keywordResults, setKeywordResults] = useState<KeywordResult[] | null>(null)

  useEffect(() => {
    if (!isAuthenticated) return
    let active = true
    listCloudProjects()
      .then(result => { if (active) setProjects(result.projects.filter(project => project.resultReady)) })
      .catch(() => { if (active) setProjectsFailed(true) })
    return () => { active = false }
  }, [isAuthenticated])

  const selectProject = async (id: string) => {
    setSelectedId(id)
    setLoadingWorkspace(true)
    setWorkspaceFailed(false)
    setKeywordResults(null)
    try {
      const workspace = await restoreCloudProject(id)
      const keywords = Array.from(new Set(
        workspace.results.assets.flatMap(asset => asset.ocr.regions.map(region => region.text.trim())).filter(Boolean),
      )).slice(0, MAX_KEYWORDS)

      if (keywords.length === 0) {
        setKeywordResults([])
        return
      }

      const results = await Promise.all(keywords.map(async (keyword): Promise<KeywordResult> => {
        try {
          const stickers = await fetchOgqStickers(STICKERS_PER_KEYWORD, keyword)
          return { keyword, stickers, failed: false }
        } catch {
          return { keyword, stickers: [], failed: true }
        }
      }))
      setKeywordResults(results)
    } catch {
      setWorkspaceFailed(true)
    } finally {
      setLoadingWorkspace(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <Header center={<button type="button" onClick={() => navigate('/dashboard')} className="rounded-xl px-3 py-2 text-sm font-bold text-sub hover:bg-surface">{t.hubDashboard}</button>} sticky />

      <main className="layout-app pb-24 pt-10 sm:py-16">
        <h1 className="text-[32px] font-extrabold tracking-tight sm:text-[34px]">{t.hubReview}</h1>
        <p className="mt-2 text-[16px] font-medium text-sub">{t.hubReviewDesc}</p>

        {!isAuthenticated && (
          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-sub">{t.cloudLogin}</p>
            <Button className="mt-3" onClick={() => navigate('/login?next=/review')}>{t.navLogin}</Button>
          </div>
        )}

        {isAuthenticated && (
          <>
            <section className="mt-8">
              <h2 className="text-lg font-bold">{t.reviewPickProjectTitle}</h2>
              <p className="mt-1 text-sm font-medium text-sub">{t.reviewPickProjectDesc}</p>

              {projects === null && !projectsFailed && (
                <p role="status" className="mt-5 flex items-center gap-2 text-sm text-sub"><Loader2 className="h-4 w-4 animate-spin" />{t.reviewProjectsLoading}</p>
              )}
              {projectsFailed && <p role="alert" className="mt-5 text-sm text-sub">{t.reviewProjectsFailed}</p>}
              {projects !== null && !projectsFailed && projects.length === 0 && (
                <div className="mt-5 rounded-2xl border border-dashed border-gray-200 p-6 text-center">
                  <p className="text-sm text-sub">{t.reviewProjectsEmpty}</p>
                  <Button className="mt-3" onClick={() => navigate('/localize')}>{t.reviewProjectsEmptyCta}</Button>
                </div>
              )}
              {projects !== null && projects.length > 0 && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {projects.map(project => (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => { void selectProject(project.id) }}
                      className={`flex items-center gap-4 rounded-2xl border-2 p-4 text-left transition-colors ${
                        selectedId === project.id ? 'border-brand bg-brand-soft' : 'border-gray-100 bg-white hover:border-gray-200'
                      }`}
                    >
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface">
                        {project.thumbnailUrl ? <img src={project.thumbnailUrl} alt="" className="h-full w-full object-contain" /> : <Sparkles className="h-6 w-6 text-sub" />}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-bold">{project.name}</p>
                        <p className="mt-1 text-sm text-sub">{t.hubFiles.replace('{n}', String(project.imageCount))}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>

            {selectedId && (
              <section className="mt-10">
                <h2 className="text-lg font-bold">{t.reviewSimilarTitle}</h2>
                <p className="mt-1 text-sm font-medium text-sub">{t.reviewSimilarDesc}</p>

                {loadingWorkspace && (
                  <p role="status" className="mt-5 flex items-center gap-2 text-sm text-sub"><Loader2 className="h-4 w-4 animate-spin" />{t.reviewLoadingWorkspace}</p>
                )}
                {workspaceFailed && <p role="alert" className="mt-5 text-sm text-sub">{t.reviewWorkspaceFailed}</p>}
                {keywordResults !== null && keywordResults.length === 0 && (
                  <p className="mt-5 text-sm text-sub">{t.reviewNoKeywords}</p>
                )}

                {keywordResults?.map(result => (
                  <div key={result.keyword} className="mt-6">
                    <h3 className="text-sm font-bold text-brand-dark">&ldquo;{result.keyword}&rdquo;</h3>
                    {result.failed && <p className="mt-2 text-sm text-sub">{t.reviewKeywordFailed}</p>}
                    {!result.failed && result.stickers.length === 0 && <p className="mt-2 text-sm text-sub">{t.reviewKeywordEmpty}</p>}
                    {!result.failed && result.stickers.length > 0 && (
                      <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                        {result.stickers.map(sticker => {
                          const category = sticker.categories[0]
                          const categoryLabel = category ? (lang === 'ko' ? category.krName : category.enName) : null
                          return (
                            <div key={sticker.assetId} className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
                              <div className="relative aspect-square">
                                <img src={sticker.thumbnailUrl} alt={sticker.title ?? ''} loading="lazy" className="h-full w-full object-contain p-2" />
                                {sticker.animated && (
                                  <span className="absolute right-1.5 top-1.5 rounded-full bg-ink/70 px-2 py-0.5 text-[10px] font-bold text-white">{t.reviewAnimatedBadge}</span>
                                )}
                              </div>
                              {(sticker.title || categoryLabel) && (
                                <div className="border-t border-gray-100 px-2 py-1.5">
                                  {sticker.title && <p className="truncate text-[11px] font-semibold text-ink">{sticker.title}</p>}
                                  {categoryLabel && <p className="truncate text-[10px] text-sub">{categoryLabel}</p>}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </section>
            )}

            <section className="mt-10 rounded-2xl border border-gray-100 bg-surface p-6">
              <h2 className="text-lg font-bold">{t.reviewChecklistTitle}</h2>
              <ul className="mt-4 space-y-3">
                {t.reviewChecklistItems.map(item => (
                  <li key={item} className="flex items-start gap-3 text-sm">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-dark" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-sub">{t.reviewChecklistDisclaimer}</p>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
