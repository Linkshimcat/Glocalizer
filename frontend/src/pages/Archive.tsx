import { useRef } from 'react'
import { Navigate } from 'react-router-dom'
import ProjectLibrary from '../components/ProjectLibrary'
import SessionNotice from '../components/SessionNotice'
import { useSiteLang } from '../i18n/LanguageContext'
import { experienceCopy } from '../i18n/experience'
import { useAuth } from '../store/AuthContext'

export default function Archive() {
  const { isAuthenticated, checkingSession } = useAuth()
  const enteredAuthenticated = useRef(isAuthenticated)
  const { t, lang } = useSiteLang()
  if (!isAuthenticated && !checkingSession) return <Navigate to={enteredAuthenticated.current ? '/' : '/login?next=/archive'} replace />
  return <div className="studio-archive min-h-screen bg-[#FAFBFC]">
    <main id="main-content" tabIndex={-1} className="layout-app py-10 sm:py-16">
      <SessionNotice />
      <h1 className="page-title">{t.cloudArchive}</h1>
      <p className="mt-3 text-sub">{experienceCopy[lang].archiveHint}</p>
      <ProjectLibrary archive />
    </main>
  </div>
}
