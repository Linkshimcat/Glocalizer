import { NavLink } from 'react-router-dom'
import Logo from './Logo'
import NavMenu from './NavMenu'
import AccountMenu from './AccountMenu'
import LanguageSelect from './LanguageSelect'
import { useSiteLang } from '../i18n/LanguageContext'
import { useAuth } from '../store/AuthContext'

/** Global navigation stays mounted while routes and workspace tools change. */
export default function Header() {
  const { t } = useSiteLang()
  const { isAuthenticated } = useAuth()
  return (
    <header className="site-header">
      <div className="layout-wide site-header-inner">
        <div className="site-header-logo"><Logo /></div>
        <NavMenu />
        <div className="site-header-actions">
          <LanguageSelect />
          {isAuthenticated ? <AccountMenu /> : (
            <NavLink to="/login" className="site-login">{t.navLogin}</NavLink>
          )}
        </div>
      </div>
    </header>
  )
}
