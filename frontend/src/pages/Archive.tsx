import { useCallback, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import CloudProjectList from '../components/CloudProjectList'
import GenerationList from '../components/GenerationList'
import Header from '../components/Header'
import NavMenu from '../components/NavMenu'
import { useSiteLang } from '../i18n/LanguageContext'
import { useAuth } from '../store/AuthContext'

function ArchiveSkeleton({ label }: { label: string }) {
  return <div role="status" aria-label={label} aria-busy="true" className="mt-4 grid gap-4">
    <span className="sr-only">{label}</span>
    {Array.from({ length: 2 }, (_, index) => <div key={index} aria-hidden="true" className="flex animate-pulse flex-col gap-4 rounded-[24px] border border-gray-200/70 bg-white p-5 motion-reduce:animate-none sm:flex-row sm:items-center sm:p-6">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <div className="h-20 w-20 shrink-0 rounded-2xl bg-brand-soft/70" />
        <div className="min-w-0 flex-1">
          <div className="h-6 w-16 rounded-full bg-brand-soft" />
          <div className="mt-3 h-4 w-2/5 rounded-full bg-gray-200" />
          <div className="mt-3 h-3 w-3/5 rounded-full bg-gray-100" />
          <div className="mt-2 h-3 w-1/3 rounded-full bg-gray-100" />
        </div>
      </div>
      <div className="h-11 w-full rounded-xl bg-brand-soft sm:w-72 sm:shrink-0" />
    </div>)}
  </div>
}

export default function Archive() {
  const { isAuthenticated } = useAuth()
  const enteredAuthenticated = useRef(isAuthenticated)
  const { t } = useSiteLang()
  const [cloudCount, setCloudCount] = useState<number | null>(null)
  const [generationCount, setGenerationCount] = useState<number | null>(null)
  const [cloudLoading, setCloudLoading] = useState(true)
  const [generationLoading, setGenerationLoading] = useState(true)
  const handleCloudLoading = useCallback((loading: boolean) => setCloudLoading(loading), [])
  const handleGenerationLoading = useCallback((loading: boolean) => setGenerationLoading(loading), [])
  const loading = cloudLoading || generationLoading
  if (!isAuthenticated) return <Navigate to={enteredAuthenticated.current ? '/' : '/login'} replace />
  return <div className="min-h-screen bg-[#FAFBFC]">
    <Header center={<NavMenu workspace />} sticky />
    <main className="layout-app py-10 sm:py-16">
      <p className="text-sm font-extrabold text-brand-dark">Glocalizer</p>
      <h1 className="mt-3 text-[30px] font-extrabold tracking-tight sm:text-[38px]">{t.cloudArchive}</h1>
      {loading ? <ArchiveSkeleton label={t.cloudLoading} /> : null}
      <CloudProjectList archive onCount={setCloudCount} onLoadingChange={handleCloudLoading} deferRender={loading} />
      <GenerationList archive onCount={setGenerationCount} onLoadingChange={handleGenerationLoading} deferRender={loading} />
      {!loading && cloudCount === 0 && generationCount === 0 ? <p className="mt-5 rounded-2xl border border-dashed border-gray-200 p-6 text-sm text-sub">{t.cloudEmptyArchive}</p> : null}
    </main>
  </div>
}
