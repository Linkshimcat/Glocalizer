import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../store/ThemeContext'
import { useSiteLang } from '../i18n/LanguageContext'
import { experienceCopy } from '../i18n/experience'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const { lang } = useSiteLang()
  const copy = experienceCopy[lang]
  const label = theme === 'dark' ? copy.themeToLight : copy.themeToDark

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className="site-nav-toggle"
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}
