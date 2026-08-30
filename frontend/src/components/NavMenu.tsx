import { useNavigate } from 'react-router-dom'
import LanguageSelect from './LanguageSelect'
import { useSiteLang } from '../i18n/LanguageContext'

export default function NavMenu() {
  const navigate = useNavigate()
  const { t } = useSiteLang()

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
    </nav>
  )
}
