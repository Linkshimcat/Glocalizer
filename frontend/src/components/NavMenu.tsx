import { useNavigate } from 'react-router-dom'
import LanguageSelect from './LanguageSelect'
import { useSiteLang } from '../i18n/LanguageContext'
import { useAuth } from '../store/AuthContext'

export default function NavMenu() {
  const navigate = useNavigate()
  const { t } = useSiteLang()
  const { isAuthenticated, user, logout } = useAuth()

  return (
    <nav aria-label="주요 메뉴" className="flex items-center gap-1.5">
      <button
        onClick={() => navigate('/dashboard')}
        className="rounded-xl px-3 py-1.5 text-[13px] font-bold text-ink transition-colors hover:bg-surface md:px-4 md:py-2 md:text-sm"
      >
        {t.navStart}
      </button>
      <button
        type="button"
        onClick={() => navigate('/service')}
        className="rounded-xl px-3 py-1.5 text-[13px] font-bold text-sub transition-colors hover:bg-surface hover:text-ink md:px-4 md:py-2 md:text-sm"
      >
        {t.navService}
      </button>
      <LanguageSelect />
      {isAuthenticated ? (
        <button
          type="button"
          onClick={logout}
          title={user?.email ?? user?.name ?? undefined}
          className="rounded-xl px-3 py-1.5 text-[13px] font-bold text-sub transition-colors hover:bg-surface hover:text-ink md:px-4 md:py-2 md:text-sm"
        >
          {t.navLogout}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="rounded-xl bg-surface px-3 py-1.5 text-[13px] font-bold text-ink transition-colors hover:bg-[#E8EBEE] md:px-4 md:py-2 md:text-sm"
        >
          {t.navLogin}
        </button>
      )}
    </nav>
  )
}
