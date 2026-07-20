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
]

interface UploadState {
  files: UploadFile[]
  /** 추가된 파일들의 id 목록을 반환 (자동 선택 등에 사용) */
  addFiles: (files: File[]) => string[]
  removeFile: (id: string) => void
  removeFiles: (ids: string[]) => void
  targetLangs: Language[]
  toggleTargetLang: (lang: Language) => void
  setTargetLangs: (langs: Language[]) => void
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
    return next.map(f => f.id)
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
      setTargetLangs,
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
