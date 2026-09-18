import { useAuth } from './AuthContext'
import { useSiteLang } from '../i18n/LanguageContext'
import { restoreCloudProject, saveCloudDraft, finishCloudProject, type CloudWorkspace } from '../lib/api'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { styleKeyForRegion, type Style } from '../lib/style'
import type { NormalizedRect } from '../lib/style'
import { pickFontByStyle } from '../data/demo'
import {
  ApiError,
  getProjectResults,
  getProjectStatus,
  startProject,
  uploadToSignedUrl,
  completeUploads,
  createOcrRegion,
  detectOcrRegion,
  regenerateTranslation,
  saveEditorState,
  reviseOcr,
  recordDownload as recordDownloadApi,
  type ProjectResults,
  type ProjectStatus,
  type DetectedOcrSelection,
} from '../lib/api'

export interface UploadFile {
  id: string
  name: string
  size?: number
  /** 업로드 전 미리보기 data URL 또는 클라우드에서 갱신한 이미지 URL */
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
    width: number | null
    height: number | null
    regionId: string | null
    normalizedBox: NormalizedRect | null
    cleanupMethod: string | null
    cleanupQuality: string | null
    needsManualCleanup: boolean
    needsManualOcrReview: boolean
    /** 원본에서 감지한 글자색 {r,g,b} — 번역 텍스트 기본 색. 감지 실패 시 null */
    textColor: { r: number; g: number; b: number } | null
    regions: RegionAnalysis[]
  }
}

export interface RegionAnalysis {
  id: string
  korean: string
  normalizedBox: NormalizedRect | null
  localizations: Record<string, LocalizedAnalysis>
  needsManualCleanup: boolean
  needsManualOcrReview: boolean
  textColor: { r: number; g: number; b: number } | null
}

export interface LocalizedAnalysis {
  status: 'translated' | 'failed'
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

/* ── 클라우드 작업 포인터 및 이전 탭 저장 데이터 정리 ─────────────── */

const SESSION_PREFIX = 'glocalizer:'
const WORKFLOW_SESSION_KEYS = [
  'files',
  'selectedFileIds',
  'targetLangs',
  'styles',
  'projectId',
  'projectToken',
  'projectStatus',
  'projectResults',
  'resultReady',
] as const

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

/** 업로드 전 미리보기용 File → data URL */
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
  resetWorkflow: () => void
  resultReady: boolean
  markResultReady: () => Promise<void>
  openCloudProject: (id: string) => Promise<string>
  saveDraft: () => Promise<string>
  flushCloudWork: () => Promise<void>
  cloudSaving: boolean
  cloudError: string | null
  /** 파일·언어별 에디터 편집 상태 — 결과 페이지 다운로드에서 재사용 */
  styles: StylesByLanguage
  saveStyle: (id: string, languageCode: string, style: Style, regionId?: string | null) => void
  /** 이모티콘 변환 완주(다운로드) 기록 — 실패해도 실제 다운로드 경험엔 영향 없음(fire-and-forget) */
  recordDownload: (kind: 'single' | 'zip', languageCode?: string) => void
  projectStatus: ProjectStatus | null
  projectResults: ProjectResults | null
  processingError: string | null
  startLocalization: () => Promise<void>
  refreshProject: () => Promise<ProjectStatus | null>
  reviseOcr: (fileId: string, text: string, normalizedBox: NormalizedRect, regionId?: string | null) => Promise<void>
  detectOcrRegion: (fileId: string, normalizedBox: NormalizedRect) => Promise<DetectedOcrSelection>
  addOcrRegion: (fileId: string, text: string, normalizedBox: NormalizedRect) => Promise<void>
  retryTranslation: (fileId: string, regionId: string, languageCode: string) => Promise<void>
}

const UploadContext = createContext<UploadState | null>(null)

export function UploadProvider({ children }: { children: ReactNode }) {
  const { user, token } = useAuth()
  const { t } = useSiteLang()
  const [cloudSaving, setCloudSaving] = useState(() => Boolean(user && loadSession('cloudOwnerId', null) === user.id && loadSession('cloudProjectId', null)))
  const [pendingStyleSaves, setPendingStyleSaves] = useState(0)
  const [cloudError, setCloudError] = useState<string | null>(null)
  const epoch = useRef(0)
  const cloudDraft = useRef<{ id: string | null; fingerprint: string }>({ id: null, fingerprint: '' })
  const draftQueue = useRef<Promise<unknown>>(Promise.resolve())
  const initializedOwner = useRef<string | null | undefined>(undefined)

  const [files, setFiles] = useState<UploadFile[]>([])
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([])
  const [targetLangs, setTargetLangs] = useState<Language[]>([])
  const [styles, setStyles] = useState<StylesByLanguage>({})
  const [projectId, setProjectId] = useState<string | null>(null)
  const [projectToken, setProjectToken] = useState<string | null>(null)
  const [projectStatus, setProjectStatus] = useState<ProjectStatus | null>(null)
  const [projectResults, setProjectResults] = useState<ProjectResults | null>(null)
  const [resultReady, setResultReady] = useState(false)
  const [processingError, setProcessingError] = useState<string | null>(null)

  const resetWorkflow = useCallback(() => {
    epoch.current += 1
    cloudDraft.current = { id: null, fingerprint: '' }
    pendingStyles.current.clear()
    setCloudError(null)
    setFiles([])
    setSelectedFileIds([])
    setTargetLangs([])
    setStyles({})
    setProjectId(null)
    setProjectToken(null)
    setProjectStatus(null)
    setProjectResults(null)
    setResultReady(false)
    setProcessingError(null)
    try {
      for (const key of [...WORKFLOW_SESSION_KEYS, 'cloudProjectId']) sessionStorage.removeItem(SESSION_PREFIX + key)
    } catch {
      // 저장소 접근이 막힌 환경에서도 메모리 상태 초기화는 유지한다.
    }
  }, [])

  useEffect(() => {
    if (user && initializedOwner.current === user.id) {
      saveSession('cloudOwnerId', user.id)
      saveSession('cloudProjectId', projectId)
    }
  }, [user, projectId])

  const styleQueue = useRef<Promise<unknown>>(Promise.resolve())
  const pendingStyles = useRef(new Map<string, { projectId: string; token: string; assetId: string; regionId: string; languageCode: string; style: Style }>())
  const flushEdits = useCallback(async () => {
    await styleQueue.current.catch(() => undefined)
    for (const [key, write] of pendingStyles.current) {
      await saveEditorState(write.projectId, write.token, write.assetId, write.regionId, write.languageCode, write.style)
      if (pendingStyles.current.get(key) === write) pendingStyles.current.delete(key)
    }
    setCloudError(null)
  }, [])

  const markResultReady = useCallback(async () => {
    if (!projectId || !token) throw new ApiError(t.cloudLogin)
    await flushEdits()
    await finishCloudProject(projectId)
    setResultReady(true)
  }, [projectId, token, t.cloudLogin, flushEdits])

  const saveStyle = useCallback((id: string, languageCode: string, style: Style, regionId?: string | null) => {
    const file = files.find(candidate => candidate.id === id)
    const targetRegionId = regionId ?? file?.analysis?.regionId
    const styleKey = styleKeyForRegion(id, targetRegionId, file?.analysis?.regionId)
    setStyles(prev => ({ ...prev, [styleKey]: { ...prev[styleKey], [languageCode]: style } }))
    if (!projectId || !projectToken || !file?.assetId || !targetRegionId || !languageCode) return
    const saveEpoch = epoch.current
    const key = `${file.assetId}:${targetRegionId}:${languageCode}`
    const write = { projectId, token: projectToken, assetId: file.assetId, regionId: targetRegionId, languageCode, style }
    pendingStyles.current.set(key, write)
    setPendingStyleSaves(value => value + 1)
    const previous = styleQueue.current.catch(() => undefined)
    styleQueue.current = previous.then(async () => {
      if (saveEpoch !== epoch.current || pendingStyles.current.get(key) !== write) return
      await saveEditorState(projectId, projectToken, file.assetId!, targetRegionId, languageCode, style)
      if (pendingStyles.current.get(key) === write) pendingStyles.current.delete(key)
      if (saveEpoch === epoch.current && !pendingStyles.current.size) setCloudError(null)
    }).catch(() => {
      if (saveEpoch === epoch.current) setCloudError(t.cloudSaveFailed)
    }).finally(() => { setPendingStyleSaves(value => Math.max(0, value - 1)) })
  }, [files, projectId, projectToken, t.cloudSaveFailed])

  const recordDownload = useCallback((kind: 'single' | 'zip', languageCode?: string) => {
    if (!projectId || !projectToken) return
    void recordDownloadApi(projectId, projectToken, kind, languageCode).catch(() => {
      // 카운팅 실패가 실제 다운로드 경험을 막으면 안 됨 — 조용히 무시
    })
  }, [projectId, projectToken])

  const addFiles = useCallback((incoming: File[]) => {
    const addingEpoch = epoch.current
    const imgs = incoming.filter(f => f.type.startsWith('image/'))
    const ids = imgs.map(() => crypto.randomUUID())
    // data URL 변환 후 순서 유지하며 한 번에 추가
    Promise.all(imgs.map(readAsDataURL)).then(urls => {
      if (addingEpoch !== epoch.current) return
      setFiles(prev => [
        ...prev,
        ...urls.map((url, i) => ({
          id: ids[i],
          name: imgs[i].name,
          size: imgs[i].size,
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
      for (const key of Object.keys(next)) {
        if (ids.some(id => key === id || key.startsWith(`${id}::`))) delete next[key]
      }
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

  const refreshProject = useCallback(async (workspace?: CloudWorkspace): Promise<ProjectStatus | null> => {
    const activeId = workspace?.projectId ?? projectId
    const activeToken = workspace?.projectToken ?? projectToken
    const activeFiles: UploadFile[] = workspace?.files ?? files
    const activeLanguages = workspace ? LANGUAGES.filter(language => workspace.results.targetLanguages.includes(language.code)) : targetLangs
    if (!activeId || !activeToken) return null
    const status = workspace?.status ?? await getProjectStatus(activeId, activeToken)
    setProjectStatus(status)
    // 부분 실패·전체 실패여도 실제 OCR 결과와 오류 상태를 복원해야 Editor가 데모 문구로
    // 대체하지 않고 사용자의 OCR 수정·수동 cleanup을 이어갈 수 있다.
    if (status.status === 'completed' || status.status === 'failed') {
      const results = workspace?.results ?? await getProjectResults(activeId, activeToken)
      setProjectResults(results)
      setStyles(previous => {
        const restored = { ...previous }
        for (const file of activeFiles) {
          const asset = results.assets.find(result => result.id === file.assetId)
          for (const language of activeLanguages) {
            for (const region of asset?.ocr.regions ?? []) {
              const savedStyle = asset?.regionEditorStates?.[region.id]?.[language.code]
              if (!savedStyle) continue
              const key = styleKeyForRegion(file.id, region.id, asset?.ocr.primaryRegionId)
              restored[key] = { ...restored[key], [language.code]: savedStyle as Style }
            }
          }
        }
        return restored
      })
      setFiles(previous => (workspace ? activeFiles : previous).map(file => {
        const asset = results.assets.find(result => result.id === file.assetId)
        if (!asset) return file
        return {
          ...file,
          // Editor의 변환 미리보기와 PNG export는 cleanup 결과를 base image로 사용해야 한다.
          // originalUrl은 좌측 원본 비교 화면에서 analysis.originalUrl로 별도 유지한다.
          url: asset.cleanedUrl ?? asset.originalUrl ?? file.url,
          analysis: {
            korean: asset.ocr.fullText ?? '',
            localizations: Object.fromEntries(activeLanguages.map(language => {
              const localization = asset.localizations[language.code]
              // 원본 글자 시각 분석(font-style-vision.service.ts)이 있으면 그걸로 유사 폰트를
              // 찾고, 실패했을 때만 번역 LLM이 텍스트 뉘앙스로 찍은 카테고리로 대체한다.
              const suggestedFont = asset.ocr.fontStyle
                ? pickFontByStyle(asset.ocr.fontStyle, asset.id)
                : fontForCategory(localization?.recommendedStyle?.fontCategory)
              return [language.code, {
                status: localization?.status ?? 'failed',
                suggestions: localization?.candidates ?? [],
                recommendedFont: fontForLanguage(language.code, suggestedFont),
              }]
            })),
            originalUrl: asset.originalUrl,
            cleanedUrl: asset.cleanedUrl,
            width: asset.width,
            height: asset.height,
            regionId: asset.ocr.primaryRegionId,
            normalizedBox: asset.ocr.regions.find(region => region.id === asset.ocr.primaryRegionId)?.normalizedBox ?? null,
            cleanupMethod: asset.cleanup.method,
            cleanupQuality: asset.cleanup.quality,
            needsManualCleanup: asset.cleanup.needsManualCleanup,
            needsManualOcrReview: asset.needsManualOcrReview,
            textColor: asset.cleanup.textColor,
            regions: asset.ocr.regions.map(region => ({
              id: region.id,
              korean: region.text,
              normalizedBox: region.normalizedBox,
              localizations: Object.fromEntries(activeLanguages.map(language => {
                const localization = region.localizations[language.code]
                const suggestedFont = region.fontStyle
                  ? pickFontByStyle(region.fontStyle, region.id)
                  : fontForCategory(localization?.recommendedStyle?.fontCategory)
                return [language.code, {
                  status: localization?.status ?? 'failed',
                  suggestions: localization?.candidates ?? [],
                  recommendedFont: fontForLanguage(language.code, suggestedFont),
                }]
              })),
              needsManualCleanup: region.needsManualCleanup,
              needsManualOcrReview: region.needsManualReview,
              textColor: region.textColor,
            })),
          },
        }
      }))
    }
    return status
  }, [files, projectId, projectToken, targetLangs])

  const openCloudProject = useCallback(async (id: string): Promise<string> => {
    const openingEpoch = ++epoch.current
    setCloudSaving(true)
    setCloudError(null)
    try {
      const workspace = await restoreCloudProject(id)
      if (openingEpoch !== epoch.current) throw new ApiError(t.cloudSaveFailed)
      cloudDraft.current = { id: workspace.status.status === 'created' ? id : null, fingerprint: '' }
      pendingStyles.current.clear()
      setProjectId(id)
      setProjectToken('account')
      setFiles(workspace.files.map(file => ({ ...file, url: workspace.results.assets.find(asset => asset.id === file.assetId)?.originalUrl ?? undefined })))
      setSelectedFileIds(workspace.selectedClientIds)
      setTargetLangs(LANGUAGES.filter(language => workspace.results.targetLanguages.includes(language.code)))
      setStyles({})
      setProjectResults(null)
      setProjectStatus(workspace.status)
      setResultReady(workspace.resultReady)
      setProcessingError(null)
      if (['completed', 'failed'].includes(workspace.status.status)) await refreshProject(workspace)
      return workspace.status.status === 'created' ? '/localize' : workspace.resultReady ? '/result' : '/editor'
    } catch (error) {
      setCloudError(error instanceof Error ? error.message : t.cloudSaveFailed)
      throw error
    } finally { setCloudSaving(false) }
  }, [refreshProject, t.cloudSaveFailed])

  const saveDraft = useCallback(async (): Promise<string> => {
    if (!user || !token) throw new ApiError(t.cloudLogin)
    if (files.length === 0 && !cloudDraft.current.id) throw new ApiError(t.dashHintNoFile)
    if (projectStatus && projectStatus.status !== 'created') throw new ApiError(t.cloudSaveFailed)
    const saveEpoch = epoch.current
    const fingerprint = JSON.stringify([files.map(file => file.id), selectedFileIds, targetLangs.map(language => language.code)])
    const operation = draftQueue.current.catch(() => undefined).then(async () => {
      if (saveEpoch !== epoch.current) throw new ApiError(t.cloudSaveFailed)
      if (cloudDraft.current.id && cloudDraft.current.fingerprint === fingerprint) return cloudDraft.current.id
      setCloudSaving(true)
      setCloudError(null)
      try {
        const metadata = await Promise.all(files.map(async file => {
          const size = file.size ?? (await fileToUploadFile(file)).size
          return { clientId: file.id, name: file.name, mimeType: file.type ?? 'image/png', size }
        }))
        const draft = await saveCloudDraft(cloudDraft.current.id, metadata, targetLangs.map(language => language.code), selectedFileIds)
        // Preserve the draft ID on failed uploads so retry never creates duplicate projects.
        if (saveEpoch !== epoch.current) throw new ApiError(t.cloudSaveFailed)
        cloudDraft.current.id = draft.projectId
        const uploads = draft.assets.filter(asset => asset.uploadUrl)
        await Promise.all(uploads.map(async asset => {
          const file = files.find(file => file.id === asset.clientId)!
          await uploadToSignedUrl(asset.uploadUrl!, await fileToUploadFile(file))
        }))
        if (draft.assets.length) await completeUploads(draft.projectId, 'account', draft.assets.map(asset => asset.assetId))
        if (saveEpoch !== epoch.current) throw new ApiError(t.cloudSaveFailed)
        cloudDraft.current.fingerprint = fingerprint
        setProjectId(draft.projectId)
        setProjectToken('account')
        setProjectStatus({ projectId: draft.projectId, status: 'created', stage: null, progress: 0, message: '', assets: [] })
        setFiles(previous => previous.map(file => ({ ...file, assetId: draft.assets.find(asset => asset.clientId === file.id)?.assetId ?? file.assetId, size: metadata.find(item => item.clientId === file.id)?.size ?? file.size })))
        return draft.projectId
      } catch (error) {
        if (saveEpoch === epoch.current) setCloudError(error instanceof Error ? error.message : t.cloudSaveFailed)
        throw error
      } finally { if (saveEpoch === epoch.current) setCloudSaving(false) }
    })
    draftQueue.current = operation
    return operation
  }, [files, selectedFileIds, targetLangs, user, token, projectStatus, t.cloudLogin, t.cloudSaveFailed, t.dashHintNoFile])

  useEffect(() => {
    if (!user || !token || (!files.length && !cloudDraft.current.id) || (projectStatus && projectStatus.status !== 'created')) return
    const timer = setTimeout(() => { void saveDraft().catch(() => undefined) }, 700)
    return () => clearTimeout(timer)
  }, [user, token, files, selectedFileIds, targetLangs, projectStatus, saveDraft])

  useEffect(() => {
    const owner = user?.id ?? null
    if (initializedOwner.current === owner) return
    const first = initializedOwner.current === undefined
    initializedOwner.current = owner
    const savedOwner = loadSession<string | null>('cloudOwnerId', null)
    const savedId = loadSession<string | null>('cloudProjectId', null)
    resetWorkflow()
    if (first && owner && savedOwner === owner && savedId) {
      void openCloudProject(savedId).catch(() => undefined)
    }
    if (!owner || savedOwner !== owner) {
      saveSession('cloudOwnerId', owner)
      saveSession('cloudProjectId', null)
    }
  }, [user, resetWorkflow, openCloudProject])

  const flushCloudWork = useCallback(async () => {
    if (!user || !token) return
    if ((!projectStatus || projectStatus.status === 'created') && files.length) await saveDraft()
    await flushEdits()
  }, [user, token, projectStatus, files.length, saveDraft, flushEdits])

  useEffect(() => {
    const fingerprint = JSON.stringify([files.map(file => file.id), selectedFileIds, targetLangs.map(language => language.code)])
    const dirtyDraft = Boolean(user && (files.length || cloudDraft.current.id) && (!projectStatus || projectStatus.status === 'created') && fingerprint !== cloudDraft.current.fingerprint)
    if (!dirtyDraft && !pendingStyles.current.size && !(cloudSaving && files.length)) return
    const warnUnsaved = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warnUnsaved)
    return () => window.removeEventListener('beforeunload', warnUnsaved)
  }, [user, files, selectedFileIds, targetLangs, projectStatus, cloudSaving, pendingStyleSaves, cloudError])

  const startLocalization = useCallback(async () => {
    if (!user || !token) throw new ApiError(t.cloudLogin)
    if (selectedFileIds.length === 0 || targetLangs.length === 0) throw new ApiError(t.dashHintNoLang)
    setProcessingError(null)
    setResultReady(false)
    const id = await saveDraft()
    await startProject(id, 'account')
    setProjectStatus({ projectId: id, status: 'processing', stage: 'validating', progress: 0, message: '', assets: [] })
    setProjectResults(null)
  }, [user, token, selectedFileIds, targetLangs, saveDraft, t.cloudLogin, t.dashHintNoLang])

  const reviseAssetOcr = useCallback(async (fileId: string, text: string, normalizedBox: NormalizedRect, regionId?: string | null) => {
    const file = files.find(candidate => candidate.id === fileId)
    if (!projectId || !projectToken || !file?.assetId) throw new ApiError('OCR 수정 세션을 찾을 수 없어요.')
    await reviseOcr(projectId, projectToken, file.assetId, text, normalizedBox, regionId ?? undefined)
    setResultReady(false)
    setProjectStatus(previous => previous ? { ...previous, status: 'processing', stage: 'ocr-corrected' } : previous)
  }, [files, projectId, projectToken])

  const detectAssetOcrRegion = useCallback(async (fileId: string, normalizedBox: NormalizedRect) => {
    const file = files.find(candidate => candidate.id === fileId)
    if (!projectId || !projectToken || !file?.assetId) throw new ApiError('OCR 수정 세션을 찾을 수 없어요.')
    return detectOcrRegion(projectId, projectToken, file.assetId, normalizedBox)
  }, [files, projectId, projectToken])

  const addAssetOcrRegion = useCallback(async (fileId: string, text: string, normalizedBox: NormalizedRect) => {
    const file = files.find(candidate => candidate.id === fileId)
    if (!projectId || !projectToken || !file?.assetId) throw new ApiError('OCR 수정 세션을 찾을 수 없어요.')
    await createOcrRegion(projectId, projectToken, file.assetId, text, normalizedBox)
    setResultReady(false)
    setProjectStatus(previous => previous ? { ...previous, status: 'processing', stage: 'ocr-corrected' } : previous)
  }, [files, projectId, projectToken])

  const retryAssetTranslation = useCallback(async (fileId: string, regionId: string, languageCode: string) => {
    const file = files.find(candidate => candidate.id === fileId)
    if (!projectId || !projectToken || !file?.assetId) throw new ApiError('번역 세션을 찾을 수 없어요.')
    await regenerateTranslation(projectId, projectToken, file.assetId, regionId, languageCode)
  }, [files, projectId, projectToken])

  const value = useMemo(
    () => ({
      cloudSaving: cloudSaving || pendingStyleSaves > 0,
      cloudError,
      flushCloudWork,
      openCloudProject,
      saveDraft,
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
      resetWorkflow,
      resultReady,
      markResultReady,
      styles,
      saveStyle,
      recordDownload,
      projectStatus,
      projectResults,
      processingError,
      startLocalization,
      refreshProject,
      reviseOcr: reviseAssetOcr,
      detectOcrRegion: detectAssetOcrRegion,
      addOcrRegion: addAssetOcrRegion,
      retryTranslation: retryAssetTranslation,
    }),
    [
      cloudSaving,
      pendingStyleSaves,
      flushCloudWork,
      cloudError,
      openCloudProject,
      saveDraft,
      files,
      selectedFileIds,
      addFiles,
      removeFile,
      removeFiles,
      toggleFileSelection,
      targetLangs,
      toggleTargetLang,
      resetWorkflow,
      resultReady,
      markResultReady,
      styles,
      saveStyle,
      recordDownload,
      projectStatus,
      projectResults,
      processingError,
      startLocalization,
      refreshProject,
      reviseAssetOcr,
      detectAssetOcrRegion,
      addAssetOcrRegion,
      retryAssetTranslation,
    ],
  )

  return <UploadContext.Provider value={value}>{children}</UploadContext.Provider>
}

function fontForCategory(category: string | undefined): string {
  if (category === 'comic') return 'Bangers'
  if (category === 'cute') return 'Fredoka'
  if (category === 'handwriting') return 'Gaegu'
  if (category === 'minimal') return 'Gothic A1'
  // 기본값: 통통 둥근 이모티콘 친화 폰트(다중 굵기 지원 → 굵기 조절 가능).
  return 'Baloo 2'
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
