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
import type { NormalizedRect } from '../lib/style'
import {
  ApiError,
  createProject,
  getProjectResults,
  getProjectStatus,
  startProject,
  uploadToSignedUrl,
  completeUploads,
  saveEditorState,
  reviseOcr,
  type ProjectResults,
  type ProjectStatus,
} from '../lib/api'

export interface UploadFile {
  id: string
  name: string
  /** 업로드된 이미지의 data URL (새로고침에도 유지되도록 저장 가능한 형식) */
  url?: string
  /** MIME 타입 (예: image/gif) — 다운로드 형식 제한에 사용 */
  type?: string
  /** 서버 asset ID — 편집 상태 저장과 결과 연결에 사용 */
  assetId?: string
  analysis?: {
    korean: string
    localizations: Record<string, LocalizedAnalysis>
    /** 다국어 state 도입 전 sessionStorage 데이터 호환용 */
    suggestions?: Array<{ text: string; tone: string; best?: boolean }>
    recommendedFont?: string
    originalUrl: string | null
    cleanedUrl: string | null
    regionId: string | null
    normalizedBox: NormalizedRect | null
    cleanupMethod: string | null
    cleanupQuality: string | null
    needsManualCleanup: boolean
    needsManualOcrReview: boolean
  }
}

export interface LocalizedAnalysis {
  suggestions: Array<{ text: string; tone: string; best?: boolean }>
  recommendedFont: string
}

export type StylesByLanguage = Record<string, Record<string, Style>>

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

function loadStyles(): StylesByLanguage {
  const stored = loadSession<Record<string, Style | Record<string, Style>>>('styles', {})
  return Object.fromEntries(Object.entries(stored).map(([assetId, value]) => {
    if ('suggestion' in value) return [assetId, { en: value }]
    return [assetId, value]
  }))
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
  /** 현재 번역·편집 대상으로 선택된 파일 ID */
  selectedFileIds: string[]
  /** 추가된 파일들의 id 목록을 반환 (자동 선택 등에 사용) */
  addFiles: (files: File[]) => string[]
  removeFile: (id: string) => void
  removeFiles: (ids: string[]) => void
  toggleFileSelection: (id: string) => void
  setSelectedFileIds: (ids: string[]) => void
  targetLangs: Language[]
  toggleTargetLang: (lang: Language) => void
  setTargetLangs: (langs: Language[]) => void
  /** 파일·언어별 에디터 편집 상태 — 결과 페이지 다운로드에서 재사용 */
  styles: StylesByLanguage
  saveStyle: (id: string, languageCode: string, style: Style) => void
  projectStatus: ProjectStatus | null
  projectResults: ProjectResults | null
  processingError: string | null
  startLocalization: () => Promise<void>
  refreshProject: () => Promise<ProjectStatus | null>
  reviseOcr: (fileId: string, text: string, normalizedBox: NormalizedRect) => Promise<void>
}

const UploadContext = createContext<UploadState | null>(null)

export function UploadProvider({ children }: { children: ReactNode }) {
  // 초기값을 sessionStorage에서 복원 → 새로고침해도 유지
  const [files, setFiles] = useState<UploadFile[]>(() => loadSession('files', []))
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>(() => {
    const saved = loadSession<string[] | null>('selectedFileIds', null)
    return saved ?? loadSession<UploadFile[]>('files', []).map(file => file.id)
  })
  const [targetLangs, setTargetLangs] = useState<Language[]>(() =>
    loadSession('targetLangs', []),
  )
  const [styles, setStyles] = useState<StylesByLanguage>(loadStyles)
  const [projectId, setProjectId] = useState<string | null>(() => loadSession('projectId', null))
  const [projectToken, setProjectToken] = useState<string | null>(() => loadSession('projectToken', null))
  const [projectStatus, setProjectStatus] = useState<ProjectStatus | null>(() => loadSession('projectStatus', null))
  const [projectResults, setProjectResults] = useState<ProjectResults | null>(() => loadSession('projectResults', null))
  const [processingError, setProcessingError] = useState<string | null>(null)

  // 상태 변경 시 세션에 저장
  useEffect(() => saveSession('files', files), [files])
  useEffect(() => saveSession('selectedFileIds', selectedFileIds), [selectedFileIds])
  useEffect(() => saveSession('targetLangs', targetLangs), [targetLangs])
  useEffect(() => saveSession('styles', styles), [styles])
  useEffect(() => saveSession('projectId', projectId), [projectId])
  useEffect(() => saveSession('projectToken', projectToken), [projectToken])
  useEffect(() => saveSession('projectStatus', projectStatus), [projectStatus])
  useEffect(() => saveSession('projectResults', projectResults), [projectResults])

  const saveStyle = useCallback((id: string, languageCode: string, style: Style) => {
    setStyles(prev => ({ ...prev, [id]: { ...prev[id], [languageCode]: style } }))
    const file = files.find(candidate => candidate.id === id)
    if (!projectId || !projectToken || !file?.assetId || !file.analysis?.regionId || !languageCode) return
    void saveEditorState(projectId, projectToken, file.assetId, file.analysis.regionId, languageCode, style).catch(() => {
      // 로컬 세션에는 이미 저장됐다. 다음 변경 시 서버 저장을 다시 시도한다.
    })
  }, [files, projectId, projectToken])

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
    setSelectedFileIds(prev => [...new Set([...prev, ...ids])])
    return ids
  }, [])

  const removeFiles = useCallback((ids: string[]) => {
    setFiles(prev => prev.filter(f => !ids.includes(f.id)))
    setSelectedFileIds(prev => prev.filter(id => !ids.includes(id)))
    setStyles(prev => {
      const next = { ...prev }
      ids.forEach(id => delete next[id])
      return next
    })
  }, [])

  const removeFile = useCallback((id: string) => removeFiles([id]), [removeFiles])

  const toggleFileSelection = useCallback((id: string) => {
    setSelectedFileIds(prev =>
      prev.includes(id) ? prev.filter(selectedId => selectedId !== id) : [...prev, id],
    )
  }, [])

  const toggleTargetLang = useCallback((lang: Language) => {
    setTargetLangs(prev =>
      prev.some(l => l.code === lang.code)
        ? prev.filter(l => l.code !== lang.code)
        : [...prev, lang],
    )
  }, [])

  const refreshProject = useCallback(async (): Promise<ProjectStatus | null> => {
    if (!projectId || !projectToken) return null
    const status = await getProjectStatus(projectId, projectToken)
    setProjectStatus(status)
    if (status.status === 'completed') {
      const results = await getProjectResults(projectId, projectToken)
      setProjectResults(results)
      setStyles(previous => {
        const restored = { ...previous }
        for (const file of files) {
          const asset = results.assets.find(result => result.id === file.assetId)
          for (const language of targetLangs) {
            const savedStyle = asset?.editorStates[language.code]
            if (savedStyle) restored[file.id] = { ...restored[file.id], [language.code]: savedStyle as Style }
          }
        }
        return restored
      })
      setFiles(previous => previous.map(file => {
        const asset = results.assets.find(result => result.id === file.assetId)
        if (!asset) return file
        return {
          ...file,
          // Editor의 변환 미리보기와 PNG export는 cleanup 결과를 base image로 사용해야 한다.
          // originalUrl은 좌측 원본 비교 화면에서 analysis.originalUrl로 별도 유지한다.
          url: asset.cleanedUrl ?? asset.originalUrl ?? file.url,
          analysis: {
            korean: asset.ocr.fullText ?? '',
            localizations: Object.fromEntries(targetLangs.map(language => {
              const localization = asset.localizations[language.code]
              return [language.code, {
                suggestions: localization?.candidates ?? [],
                recommendedFont: fontForLanguage(language.code, fontForCategory(localization?.recommendedStyle?.fontCategory)),
              }]
            })),
            originalUrl: asset.originalUrl,
            cleanedUrl: asset.cleanedUrl,
            regionId: asset.ocr.primaryRegionId,
            normalizedBox: asset.ocr.regions.find(region => region.id === asset.ocr.primaryRegionId)?.normalizedBox ?? null,
            cleanupMethod: asset.cleanup.method,
            cleanupQuality: asset.cleanup.quality,
            needsManualCleanup: asset.cleanup.needsManualCleanup,
            needsManualOcrReview: asset.needsManualOcrReview,
          },
        }
      }))
    }
    return status
  }, [files, projectId, projectToken, targetLangs])

  const startLocalization = useCallback(async () => {
    const selected = files.filter(file => selectedFileIds.includes(file.id))
    if (selected.length === 0 || targetLangs.length === 0) {
      throw new ApiError('번역할 이미지와 언어를 선택해주세요.')
    }
    setProcessingError(null)
    try {
      const uploadFiles = await Promise.all(selected.map(fileToUploadFile))
      const created = await createProject(uploadFiles, targetLangs.map(language => language.code))
      const orderedUploads = created.assets.map((asset, index) => ({ asset, file: uploadFiles[index] }))
      await Promise.all(orderedUploads.map(({ asset, file }) => uploadToSignedUrl(asset.uploadUrl, file)))
      await completeUploads(created.projectId, created.projectToken, created.assets.map(asset => asset.assetId))
      await startProject(created.projectId, created.projectToken)
      setProjectId(created.projectId)
      setProjectToken(created.projectToken)
      setProjectStatus({ projectId: created.projectId, status: 'processing', stage: 'validating', progress: 0, message: '이미지를 준비하고 있어요', assets: [] })
      setProjectResults(null)
      setFiles(previous => previous.map(file => {
        const selectedIndex = selected.findIndex(item => item.id === file.id)
        const asset = created.assets.find(candidate => candidate.clientId === String(selectedIndex))
        return asset ? { ...file, assetId: asset.assetId } : file
      }))
    } catch (error) {
      setProcessingError(error instanceof Error ? error.message : '업로드를 시작하지 못했어요.')
      throw error
    }
  }, [files, selectedFileIds, targetLangs])

  const reviseAssetOcr = useCallback(async (fileId: string, text: string, normalizedBox: NormalizedRect) => {
    const file = files.find(candidate => candidate.id === fileId)
    if (!projectId || !projectToken || !file?.assetId) throw new ApiError('OCR 수정 세션을 찾을 수 없어요.')
    await reviseOcr(projectId, projectToken, file.assetId, text, normalizedBox)
    setProjectStatus(previous => previous ? { ...previous, status: 'processing', stage: 'ocr-corrected' } : previous)
  }, [files, projectId, projectToken])

  const value = useMemo(
    () => ({
      files,
      selectedFileIds,
      addFiles,
      removeFile,
      removeFiles,
      toggleFileSelection,
      setSelectedFileIds,
      targetLangs,
      toggleTargetLang,
      setTargetLangs,
      styles,
      saveStyle,
      projectStatus,
      projectResults,
      processingError,
      startLocalization,
      refreshProject,
      reviseOcr: reviseAssetOcr,
    }),
    [
      files,
      selectedFileIds,
      addFiles,
      removeFile,
      removeFiles,
      toggleFileSelection,
      targetLangs,
      toggleTargetLang,
      styles,
      saveStyle,
      projectStatus,
      projectResults,
      processingError,
      startLocalization,
      refreshProject,
      reviseAssetOcr,
    ],
  )

  return <UploadContext.Provider value={value}>{children}</UploadContext.Provider>
}

function fontForCategory(category: string | undefined): string {
  if (category === 'comic') return 'Bangers'
  if (category === 'cute') return 'Fredoka'
  if (category === 'handwriting') return 'Gaegu'
  if (category === 'minimal') return 'Pretendard'
  return 'Anton'
}

function fontForLanguage(languageCode: string, suggestedFont: string): string {
  if (languageCode === 'ja') return 'Noto Sans JP'
  if (languageCode === 'zh') return 'Noto Sans SC'
  return suggestedFont
}

async function fileToUploadFile(file: UploadFile): Promise<File> {
  if (!file.url) throw new ApiError(`${file.name} 파일을 다시 선택해주세요.`)
  const blob = await fetch(file.url).then(response => {
    if (!response.ok) throw new ApiError(`${file.name} 파일을 읽을 수 없어요.`)
    return response.blob()
  })
  return new File([blob], file.name, { type: file.type ?? blob.type })
}

export function useUploads() {
  const ctx = useContext(UploadContext)
  if (!ctx) throw new Error('useUploads must be used within UploadProvider')
  return ctx
}
