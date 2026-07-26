import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import globeIcon from '../assets/GCFrontendUI/globe_asia.svg'
import { useSiteLang } from '../i18n/LanguageContext'
import { SITE_LANGS } from '../i18n/translations'

export default function LanguageSelect() {
  const { lang, setLang } = useSiteLang()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = SITE_LANGS.find(l => l.code === lang) ?? SITE_LANGS[0]

  useEffect(() => {
    if (!open) return
    const onClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', onClick)
    return () => window.removeEventListener('mousedown', onClick)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-xl border-2 border-gray-100 bg-white px-2.5 py-1.5 text-[13px] font-bold text-ink transition-colors hover:border-gray-200 md:text-sm"
      >
        <img src={globeIcon} alt="" aria-hidden className="h-4 w-4" />
        <span className="hidden sm:inline">{current.label}</span>
        <span className="sm:hidden">{current.short}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-sub transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 z-40 mt-1.5 w-36 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-lg"
        >
          {SITE_LANGS.map(item => (
            <li key={item.code}>
              <button
                type="button"
                role="option"
                aria-selected={item.code === lang}
                onClick={() => {
                  setLang(item.code)
                  setOpen(false)
                }}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm font-semibold transition-colors hover:bg-surface ${
                  item.code === lang ? 'text-brand-dark' : 'text-ink'
                }`}
              >
                <span className="text-base">{item.flag}</span>
                <span>{item.short}</span>
                {item.code === lang && <span className="ml-auto text-brand-dark">✓</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
