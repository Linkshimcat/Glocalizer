import { useRef } from 'react'
import { Navigate } from 'react-router-dom'
import Header from '../components/Header'
import NavMenu from '../components/NavMenu'
import { useSiteLang } from '../i18n/LanguageContext'
import { useAuth } from '../store/AuthContext'

export default function Account() {
  const { user, isAuthenticated } = useAuth()
  const { t } = useSiteLang()
  const enteredAuthenticated = useRef(isAuthenticated)
  if (!isAuthenticated || !user) return <Navigate to={enteredAuthenticated.current ? '/' : '/login'} replace />
  const initial = (user.name ?? user.email ?? '?').trim().charAt(0).toUpperCase() || '?'

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      <Header center={<NavMenu workspace />} sticky />
      <main className="layout-app py-10 sm:py-16">
        <p className="text-sm font-extrabold text-brand-dark">Glocalizer</p>
        <h1 className="mt-3 text-[30px] font-extrabold tracking-tight sm:text-[38px]">{t.accountTitle}</h1>
        <p className="mt-3 text-base text-sub">{t.accountDesc}</p>
        <section className="mt-8 max-w-2xl rounded-[28px] border border-gray-200/70 bg-white p-6 sm:p-8" aria-label={t.accountTitle}>
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-brand-soft text-2xl font-extrabold text-brand-dark">
            {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : initial}
          </div>
          <dl className="mt-7 divide-y divide-gray-100">
            {[[t.accountName, user.name], [t.accountEmail, user.email]].map(([label, value]) => (
              <div key={label} className="py-5 first:pt-0 last:pb-0">
                <dt className="text-sm font-semibold text-sub">{label}</dt>
                <dd className="mt-2 break-words text-base font-bold text-ink">{value?.trim() || t.accountMissing}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>
    </div>
  )
}
