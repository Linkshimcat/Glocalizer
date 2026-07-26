import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { translations, type Dict, type SiteLang } from './translations'

interface SiteLangState {
  lang: SiteLang
  setLang: (lang: SiteLang) => void
  t: Dict
}

const SiteLangContext = createContext<SiteLangState | null>(null)
const STORAGE_KEY = 'glocalizer:siteLang'

function initialLang(): SiteLang {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'ko' || saved === 'en' || saved === 'ja' || saved === 'zh') return saved
  return 'ko'
}

export function SiteLangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<SiteLang>(initialLang)

  const setLang = useCallback((next: SiteLang) => {
    setLangState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // 저장 실패해도 현재 세션 언어는 유지된다.
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const value = useMemo<SiteLangState>(() => ({ lang, setLang, t: translations[lang] }), [lang, setLang])
  return <SiteLangContext.Provider value={value}>{children}</SiteLangContext.Provider>
}

export function useSiteLang(): SiteLangState {
  const context = useContext(SiteLangContext)
  if (!context) throw new Error('useSiteLang must be used within SiteLangProvider')
  return context
}
