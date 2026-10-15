import { createContext, useContext, useState, type ReactNode } from 'react'

const STORAGE_KEY = 'glocalizer:theme'
type Theme = 'light' | 'dark'

interface ThemeState {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeState | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  // index.html의 인라인 스크립트가 React 렌더 전에 이미 <html class="dark">를 정해뒀으니, 그 결과를 그대로 읽는다.
  // 정적 프리렌더(Node, document 없음)에서는 항상 라이트로 렌더하고, 브라우저에서 바로 바로잡는다.
  const [theme, setTheme] = useState<Theme>(() => (typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light'))

  const toggleTheme = () => {
    setTheme(previous => {
      const next = previous === 'dark' ? 'light' : 'dark'
      document.documentElement.classList.toggle('dark', next === 'dark')
      try { localStorage.setItem(STORAGE_KEY, next) } catch { /* 저장 공간이 막혀 있어도 테마 전환 자체는 되게 둔다 */ }
      return next
    })
  }

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme은 ThemeProvider 안에서만 쓸 수 있어요.')
  return ctx
}
