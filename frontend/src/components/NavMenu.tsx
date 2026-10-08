import { Link, NavLink, useLocation } from 'react-router-dom'
import { legalUi } from '../i18n/legalUi'
import { useSiteLang } from '../i18n/LanguageContext'

const WORKSPACE_ROUTES = ['/dashboard', '/generate', '/localize', '/review', '/editor', '/result', '/archive', '/account']

export default function NavMenu() {
  const { t, lang } = useSiteLang()
  const { pathname } = useLocation()
  const inWorkspace = WORKSPACE_ROUTES.includes(pathname)
  return (
    <nav aria-label={legalUi[lang].navigation} className="site-nav">
      <Link to="/dashboard" className={inWorkspace ? 'is-active' : ''} aria-current={inWorkspace ? 'page' : undefined}>{t.hubDashboard}</Link>
      <NavLink to="/service" className={({ isActive }) => isActive ? 'is-active' : ''}>{t.navService}</NavLink>
    </nav>
  )
}
