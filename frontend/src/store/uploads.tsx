import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Style } from '../lib/style'

export interface UploadFile {
  id: string
  name: string
  /** 실제 업로드된 이미지의 미리보기 URL (데모 항목은 없음) */
  url?: string
  /** MIME 타입 (예: image/gif) — 다운로드 형식 제한에 사용 */
  type?: string
}

export interface Language {
  code: string
  flag: string
  label: string
}

export const LANGUAGES: Language[] = [
  { code: 'en', flag: '🇺🇸', label: 'English' },
  { code: 'ja', flag: '🇯🇵', label: '日本語' },
  { code: 'zh', flag: '🇨🇳', label: '中文 (简体)' },
  { code: 'zh-TW', flag: '🇹🇼', label: '中文 (繁體)' },
  { code: 'es', flag: '🇪🇸', label: 'Español' },
  { code: 'fr', flag: '🇫🇷', label: 'Français' },
  { code: 'de', flag: '🇩🇪', label: 'Deutsch' },
  { code: 'pt', flag: '🇧🇷', label: 'Português' },
  { code: 'vi', flag: '🇻🇳', label: 'Tiếng Việt' },
  { code: 'th', flag: '🇹🇭', label: 'ภาษาไทย' },
  { code: 'id', flag: '🇮🇩', label: 'Bahasa Indonesia' },
  { code: 'ru', flag: '🇷🇺', label: 'Русский' },
]

interface UploadState {
  files: UploadFile[]
  addFiles: (files: File[]) => void
  removeFile: (id: string) => void
  removeFiles: (ids: string[]) => void
  targetLangs: Language[]
  toggleTargetLang: (lang: Language) => void
  /** 파일별 에디터 편집 상태 — 결과 페이지 다운로드에서 재사용 */
  styles: Record<string, Style>
  saveStyle: (id: string, style: Style) => void
}

const UploadContext = createContext<UploadState | null>(null)

export function UploadProvider({ children }: { children: ReactNode }) {
  const [files, setFiles] = useState<UploadFile[]>([])
  const [targetLangs, setTargetLangs] = useState<Language[]>([])
  const [styles, setStyles] = useState<Record<string, Style>>({})

  const saveStyle = useCallback((id: string, style: Style) => {
    setStyles(prev => ({ ...prev, [id]: style }))
  }, [])

  const addFiles = useCallback((incoming: File[]) => {
    const next = incoming
      .filter(f => f.type.startsWith('image/'))
      .map(f => ({
        id: crypto.randomUUID(),
        name: f.name,
        url: URL.createObjectURL(f),
        type: f.type,
      }))
    setFiles(prev => [...prev, ...next])
  }, [])

  const removeFiles = useCallback((ids: string[]) => {
    setFiles(prev => {
      prev
        .filter(f => ids.includes(f.id))
        .forEach(f => f.url && URL.revokeObjectURL(f.url))
      return prev.filter(f => !ids.includes(f.id))
    })
  }, [])

  const removeFile = useCallback(
    (id: string) => removeFiles([id]),
    [removeFiles],
  )

  const toggleTargetLang = useCallback((lang: Language) => {
    setTargetLangs(prev =>
      prev.some(l => l.code === lang.code)
        ? prev.filter(l => l.code !== lang.code)
        : [...prev, lang],
    )
  }, [])

  const value = useMemo(
    () => ({
      files,
      addFiles,
      removeFile,
      removeFiles,
      targetLangs,
      toggleTargetLang,
      styles,
      saveStyle,
    }),
    [files, addFiles, removeFile, removeFiles, targetLangs, toggleTargetLang, styles, saveStyle],
  )

  return <UploadContext.Provider value={value}>{children}</UploadContext.Provider>
}

export function useUploads() {
  const ctx = useContext(UploadContext)
  if (!ctx) throw new Error('useUploads must be used within UploadProvider')
  return ctx
}
