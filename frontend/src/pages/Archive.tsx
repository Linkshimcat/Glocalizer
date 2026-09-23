import { useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import CloudProjectList from '../components/CloudProjectList'
import GenerationList from '../components/GenerationList'
import Header from '../components/Header'
import NavMenu from '../components/NavMenu'
import { useSiteLang } from '../i18n/LanguageContext'
import { useAuth } from '../store/AuthContext'

export default function Archive() {
  const { isAuthenticated } = useAuth()
  const enteredAuthenticated = useRef(isAuthenticated)
  const { t } = useSiteLang()
  const [cloudCount, setCloudCount] = useState<number | null>(null)
  const [generationCount, setGenerationCount] = useState<number | null>(null)
  if (!isAuthenticated) return <Navigate to={enteredAuthenticated.current ? '/' : '/login'} replace />
  return <div className="min-h-screen bg-[#FAFBFC]">
    <Header center={<NavMenu workspace />} sticky />
    <main className="layout-app py-10 sm:py-16">
      <p className="text-sm font-extrabold text-brand-dark">Glocalizer</p>
      <h1 className="mt-3 text-[30px] font-extrabold tracking-tight sm:text-[38px]">{t.cloudArchive}</h1>
      <CloudProjectList archive onCount={setCloudCount} />
      <GenerationList archive onCount={setGenerationCount} />
      {cloudCount === 0 && generationCount === 0 ? <p className="mt-5 rounded-2xl border border-dashed border-gray-200 p-6 text-sm text-sub">{t.cloudEmptyArchive}</p> : null}
    </main>
  </div>
}
