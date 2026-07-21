import { createContext, useCallback, useContext, useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import type { ProjectSession } from '../lib/api/types'
import type { Style } from '../lib/style'

export interface UploadFile {
  id: string
  name: string
  type: 'image/png' | 'image/jpeg'
  size: number
  file: File
  url: string
  assetId?: string
  uploadStatus: 'pending' | 'uploading' | 'uploaded' | 'failed'
  errorMessage?: string
}

export interface Language { code: 'en' | 'ja' | 'zh'; flag: string; label: string }
export const LANGUAGES: Language[] = [
  { code: 'en', flag: '🇺🇸', label: 'English' },
  { code: 'ja', flag: '🇯🇵', label: '日本語' },
  { code: 'zh', flag: '🇨🇳', label: '中文 (简体)' },
]

const SESSION_KEY = 'glocalizer:project'
const TARGET_LANGUAGES_KEY = 'glocalizer:target-languages'

function loadProjectSession(): ProjectSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const value = JSON.parse(raw) as ProjectSession
    return new Date(value.expiresAt).getTime() > Date.now() ? value : null
  } catch { return null }
}

function loadTargetLanguages(): Language[] {
  try {
    const saved = JSON.parse(sessionStorage.getItem(TARGET_LANGUAGES_KEY) ?? '[]') as Language[]
    return saved.filter(language => LANGUAGES.some(supported => supported.code === language.code))
  } catch { return [] }
}

interface UploadState {
  files: UploadFile[]
  selectedFileIds: string[]
  addFiles: (files: File[]) => string[]
  removeFile: (id: string) => void
  removeFiles: (ids: string[]) => void
  toggleFileSelection: (id: string) => void
  setSelectedFileIds: (ids: string[]) => void
  replaceFiles: Dispatch<SetStateAction<UploadFile[]>>
  targetLangs: Language[]
  toggleTargetLang: (lang: Language) => void
  setTargetLangs: (langs: Language[]) => void
  projectSession: ProjectSession | null
  setProjectSession: (session: ProjectSession | null) => void
  styles: Record<string, Style>
  saveStyle: (id: string, style: Style) => void
}

const UploadContext = createContext<UploadState | null>(null)

export function UploadProvider({ children }: { children: ReactNode }) {
  const [files, setFiles] = useState<UploadFile[]>([])
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([])
  const [targetLangs, setTargetLangs] = useState<Language[]>(loadTargetLanguages)
  const [projectSession, setProjectSessionState] = useState<ProjectSession | null>(loadProjectSession)
  const [styles, setStyles] = useState<Record<string, Style>>(() => {
    try { return JSON.parse(sessionStorage.getItem('glocalizer:styles') ?? '{}') as Record<string, Style> } catch { return {} }
  })

  useEffect(() => { sessionStorage.setItem('glocalizer:styles', JSON.stringify(styles)) }, [styles])
  useEffect(() => { sessionStorage.setItem(TARGET_LANGUAGES_KEY, JSON.stringify(targetLangs)) }, [targetLangs])
  const setProjectSession = useCallback((session: ProjectSession | null) => {
    setProjectSessionState(session)
    if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
    else sessionStorage.removeItem(SESSION_KEY)
  }, [])
  const addFiles = useCallback((incoming: File[]) => {
    const valid = incoming.filter((file): file is File & { type: 'image/png' | 'image/jpeg' } => file.type === 'image/png' || file.type === 'image/jpeg')
    const additions = valid.map(file => ({ id: crypto.randomUUID(), name: file.name, type: file.type, size: file.size, file, url: URL.createObjectURL(file), uploadStatus: 'pending' as const }))
    setFiles(previous => [...previous, ...additions])
    setSelectedFileIds(previous => [...new Set([...previous, ...additions.map(file => file.id)])])
    return additions.map(file => file.id)
  }, [])
  const removeFiles = useCallback((ids: string[]) => {
    setFiles(previous => {
      previous.filter(file => ids.includes(file.id)).forEach(file => URL.revokeObjectURL(file.url))
      return previous.filter(file => !ids.includes(file.id))
    })
    setSelectedFileIds(previous => previous.filter(id => !ids.includes(id)))
  }, [])
  const value = useMemo(() => ({
    files, selectedFileIds, addFiles, removeFile: (id: string) => removeFiles([id]), removeFiles,
    toggleFileSelection: (id: string) => setSelectedFileIds(previous => previous.includes(id) ? previous.filter(value => value !== id) : [...previous, id]),
    setSelectedFileIds, replaceFiles: setFiles, targetLangs,
    toggleTargetLang: (lang: Language) => setTargetLangs(previous => previous.some(value => value.code === lang.code) ? previous.filter(value => value.code !== lang.code) : [...previous, lang]),
    setTargetLangs, projectSession, setProjectSession, styles, saveStyle: (id: string, style: Style) => setStyles(previous => ({ ...previous, [id]: style })),
  }), [files, selectedFileIds, addFiles, removeFiles, targetLangs, projectSession, setProjectSession, styles])
  return <UploadContext.Provider value={value}>{children}</UploadContext.Provider>
}

export function useUploads() {
  const context = useContext(UploadContext)
  if (!context) throw new Error('useUploads must be used within UploadProvider')
  return context
}
