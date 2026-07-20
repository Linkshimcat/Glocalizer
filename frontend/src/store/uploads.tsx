import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Style } from '../lib/style'

export interface UploadFile {
  id: string
  name: string
  /** 업로드된 이미지의 data URL (새로고침에도 유지되도록 저장 가능한 형식) */
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

/* ── 세션 유지 (새로고침해도 업로드/편집 내용 보존) ─────────────── */

const SESSION_PREFIX = 'glocalizer:'

function loadSession<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(SESSION_PREFIX + key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function saveSession(key: string, value: unknown) {
  try {
    sessionStorage.setItem(SESSION_PREFIX + key, JSON.stringify(value))
  } catch {
    // 용량 초과 등 — 저장 실패해도 앱은 계속 동작
  }
}

/** File → data URL (새로고침에도 살아남는 문자열) */
function readAsDataURL(file: File): Promise<string> {
  return new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.readAsDataURL(file)
  })
}

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
  // 초기값을 sessionStorage에서 복원 → 새로고침해도 유지
  const [files, setFiles] = useState<UploadFile[]>(() => loadSession('files', []))
  const [targetLangs, setTargetLangs] = useState<Language[]>(() =>
    loadSession('targetLangs', []),
  )
  const [styles, setStyles] = useState<Record<string, Style>>(() =>
    loadSession('styles', {}),
  )

  // 상태 변경 시 세션에 저장
  useEffect(() => saveSession('files', files), [files])
  useEffect(() => saveSession('targetLangs', targetLangs), [targetLangs])
  useEffect(() => saveSession('styles', styles), [styles])

  const saveStyle = useCallback((id: string, style: Style) => {
    setStyles(prev => ({ ...prev, [id]: style }))
  }, [])

  const addFiles = useCallback((incoming: File[]) => {
    const imgs = incoming.filter(f => f.type.startsWith('image/'))
    const ids = imgs.map(() => crypto.randomUUID())
    // data URL 변환 후 순서 유지하며 한 번에 추가
    Promise.all(imgs.map(readAsDataURL)).then(urls => {
      setFiles(prev => [
        ...prev,
        ...urls.map((url, i) => ({
          id: ids[i],
          name: imgs[i].name,
          type: imgs[i].type,
          url,
        })),
      ])
    })
    return ids
  }, [])

  const removeFiles = useCallback((ids: string[]) => {
    setFiles(prev => prev.filter(f => !ids.includes(f.id)))
    setStyles(prev => {
      const next = { ...prev }
      ids.forEach(id => delete next[id])
      return next
    })
  }, [])

  const removeFile = useCallback((id: string) => removeFiles([id]), [removeFiles])

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
