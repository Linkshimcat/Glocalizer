import {
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  FileArchive,
  ImageDown,
  LoaderCircle,
  Plus,
  Redo2,
  RotateCcw,
  Sparkles,
  SlidersHorizontal,
  ScanText,
  Trash2,
  Undo2,
  X,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import AuroraBackground from '../components/AuroraBackground'
import Logo from '../components/Logo'
import { useToast } from '../components/Toast'
import {
  COLORS,
  FONT_NAMES,
  clampWeight,
  fontWeights,
  toDemoItems,
} from '../data/demo'
import {
  downloadBlob,
  exportFileName,
  renderItemToPng,
  textOverlaysForItem,
  zipLocalizedItems,
} from '../lib/exportImage'
import { DEFAULT_STYLE, hexToRgba, resolveText, styleFromNormalizedBox, styleKeyForRegion, type ManualCleanup, type NormalizedRect, type Style } from '../lib/style'
import { useUploads } from '../store/uploads'
import { useSiteLang } from '../i18n/LanguageContext'
import { editorDict } from '../i18n/editor'

/** 자동 크기 맞춤에 쓸 대표(best) 번역 문구 */
function bestSuggestionText(suggestions?: Array<{ text: string; best?: boolean }>): string {
  return suggestions?.find(s => s.best)?.text ?? suggestions?.[0]?.text ?? ''
}

/** 감지 box로 초기 스타일을 만들되, AI 추천 폰트를 자동 적용(굵기는 폰트가 지원하는 값으로 보정). */
function initialStyleFor(
  box: NormalizedRect,
  textColor: { r: number; g: number; b: number } | null | undefined,
  suggestions?: Array<{ text: string; best?: boolean }>,
  recommendedFont?: string,
): Style {
  const base = styleFromNormalizedBox(box, textColor, bestSuggestionText(suggestions))
  if (!recommendedFont) return base
  return { ...base, font: recommendedFont, weight: clampWeight(recommendedFont, base.weight) }
}

// 단일 굵기 폰트에도 사용자가 굵기를 커스텀할 수 있게 하는 표준 굵기(미지원 굵기는 브라우저 합성 볼드).
const CUSTOM_WEIGHTS = [
  { label: 'Regular', value: 400 },
  { label: 'Medium', value: 500 },
  { label: 'Bold', value: 700 },
  { label: 'Black', value: 900 },
] as const

const ALIGN_X = { left: -95, center: 0, right: 95 } as const
const ALIGN_Y = { top: -105, middle: 0, bottom: 105 } as const
const ZOOMS = [50, 100, 200]
const DEFAULT_ZOOM = 100

type MobileTab = '번역' | '폰트' | '스타일'
type MobileCanvasTab = '원본' | '미리보기'
type SelectionMode = 'reselect' | 'add'

interface SelectionDraft {
  mode: SelectionMode
  regionId: string | null
  text: string
  confidence: number
  normalizedBox: NormalizedRect
}

const LOADING_STEP_COUNT = 2

/* ── 작은 UI 헬퍼 ─────────────────────────────────────────────────── */

function PanelTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-extrabold">{children}</h3>
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className={`flex h-6 w-11 items-center rounded-full p-0.5 transition-colors ${
        on ? 'justify-end bg-brand' : 'justify-start bg-gray-200'
      }`}
    >
      <span className="h-5 w-5 rounded-full bg-white shadow" />
    </button>
  )
}

interface ColorRowProps {
  value: string
  presets: string[]
  onBegin: () => void
  onLive: (color: string) => void
  onPick: (color: string) => void
  pickColorTitle: string
}

/** 프리셋 스와치 + 스펙트럼 커스텀 피커 */
function ColorRow({ value, presets, onBegin, onLive, onPick, pickColorTitle }: ColorRowProps) {
  const isCustom = !presets.includes(value)
  return (
    <div className="flex flex-wrap gap-2">
      {presets.map(c => (
        <button
          key={c}
          onClick={() => onPick(c)}
          aria-label={`색상 ${c}`}
          className={`h-8 w-8 rounded-full border-2 transition-shadow ${
            value === c
              ? 'border-brand shadow-[0_0_0_3px_rgba(34,197,94,0.25)]'
              : c.toUpperCase() === '#FFFFFF'
                ? 'border-gray-200'
                : 'border-transparent'
          }`}
          style={{ backgroundColor: c }}
        />
      ))}
      <label
        title={pickColorTitle}
        onPointerDown={onBegin}
        className={`relative h-8 w-8 cursor-pointer rounded-full border-2 ${
          isCustom
            ? 'border-brand shadow-[0_0_0_3px_rgba(34,197,94,0.25)]'
            : 'border-gray-200'
        }`}
        style={{
          background:
            'conic-gradient(#ef4444, #f59e0b, #facc15, #22c55e, #3b82f6, #8b5cf6, #ef4444)',
        }}
      >
        {isCustom && (
          <span
            className="absolute inset-1 rounded-full border border-white"
            style={{ backgroundColor: value }}
          />
        )}
        <input
          type="color"
          value={value}
          onChange={e => onLive(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
    </div>
  )
}

interface RangeRowProps {
  label: string
  min: number
  max: number
  value: number
  suffix?: string
  onBegin: () => void
  onLive: (v: number) => void
}

function RangeRow({ label, min, max, value, suffix = '', onBegin, onLive }: RangeRowProps) {
  const clampValue = (v: number) => Math.max(min, Math.min(max, v))
  // 타이핑 중 임시 문자열 (포커스 아닐 땐 null → 슬라이더 값과 동기화)
  const [draft, setDraft] = useState<string | null>(null)
  const shown = draft ?? String(value)
  return (
    <div className="flex items-center gap-3">
      <span className="w-12 shrink-0 text-xs font-semibold text-sub">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onPointerDown={onBegin}
        onChange={e => onLive(Number(e.target.value))}
        className="accent-brand min-w-0 flex-1"
      />
      {/* 값 직접 입력 — 슬라이더로 못 맞추는 정확한 값을 타이핑 */}
      <div className="flex h-8 w-[62px] shrink-0 items-center rounded-lg border-2 border-gray-100 bg-white px-1.5 focus-within:border-brand">
        <input
          type="number"
          min={min}
          max={max}
          value={shown}
          onFocus={() => {
            onBegin()
            setDraft(String(value))
          }}
          onChange={e => {
            setDraft(e.target.value)
            const n = Number(e.target.value)
            if (e.target.value !== '' && e.target.value !== '-' && !Number.isNaN(n)) {
              onLive(clampValue(n))
            }
          }}
          onBlur={() => {
            const n = Number(draft)
            onLive(Number.isNaN(n) || draft === '' ? min : clampValue(n))
            setDraft(null)
          }}
          className="w-full min-w-0 bg-transparent text-right text-sm font-bold text-brand-dark outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        {suffix && (
          <span className="pl-0.5 text-xs font-bold text-brand-dark">{suffix}</span>
        )}
      </div>
    </div>
  )
}

/* ── 에디터 본체 ──────────────────────────────────────────────────── */

export default function Editor() {
  const navigate = useNavigate()
  const {
    files,
    selectedFileIds,
    removeFile,
    resetWorkflow,
    targetLangs,
    styles: savedStyles,
    saveStyle,
    recordDownload,
    markResultReady,
    projectStatus,
    refreshProject,
    reviseOcr,
    detectOcrRegion,
    addOcrRegion,
    retryTranslation,
  } = useUploads()

  const availableLanguages = useMemo(
    () => targetLangs.length > 0 ? targetLangs : [{ code: 'en', flag: '🇺🇸', label: 'English' }],
    [targetLangs],
  )
  const [activeLanguageCode, setActiveLanguageCode] = useState(availableLanguages[0].code)
  const activeLanguage = availableLanguages.find(language => language.code === activeLanguageCode) ?? availableLanguages[0]
  useEffect(() => {
    if (!availableLanguages.some(language => language.code === activeLanguageCode)) setActiveLanguageCode(availableLanguages[0].code)
  }, [activeLanguageCode, availableLanguages])

  // 업로드된 파일이 있으면 그걸 쓰고, 없으면 데모 데이터로 시연
  const [removedDemoIds, setRemovedDemoIds] = useState<string[]>([])
  const selectedFiles = useMemo(
    () => files.filter(file => selectedFileIds.includes(file.id)),
    [files, selectedFileIds],
  )
  const editorFiles = files.length > 0 && selectedFiles.length > 0 ? selectedFiles : files
  const items = useMemo(
    () => toDemoItems(editorFiles, activeLanguage.code).filter(item => !removedDemoIds.includes(item.id)),
    [editorFiles, removedDemoIds, activeLanguage.code],
  )

  const [currentIdx, setCurrentIdx] = useState(0)
  const current = items[Math.min(currentIdx, items.length - 1)]
  const textRegions = useMemo(() => current.textRegions?.length
    ? current.textRegions
    : [{
        id: current.analysis?.regionId ?? current.id,
        korean: current.korean,
        normalizedBox: current.analysis?.normalizedBox ?? null,
        suggestions: current.suggestions,
        recommendedFont: current.recommendedFont,
        textColor: current.analysis?.textColor ?? null,
        needsManualCleanup: current.analysis?.needsManualCleanup ?? false,
        needsManualOcrReview: current.analysis?.needsManualOcrReview ?? false,
        translationStatus: current.suggestions.length > 0 ? 'translated' as const : 'failed' as const,
      }], [current])
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null)
  const activeRegion = textRegions.find(region => region.id === selectedRegionId) ?? textRegions[0]
  const activeStyleKey = styleKeyForRegion(current.id, activeRegion.id, current.analysis?.regionId)
  const [doneIds, setDoneIds] = useState<string[]>([])

  const toast = useToast()
  const { t, lang } = useSiteLang()
  const e = editorDict[lang]

  // AI 자동 배경 정리가 안 된 경우, 캡션 텍스트만으론 놓치기 쉬워서 토스트로도 알려준다.
  const manualCleanupWarnedIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (current.analysis?.needsManualCleanup && manualCleanupWarnedIdRef.current !== current.id) {
      manualCleanupWarnedIdRef.current = current.id
      toast(t.toastCleanupManual)
    }
  }, [current.id, current.analysis?.needsManualCleanup, t.toastCleanupManual, toast])

  // 스타일 + undo/redo 히스토리
  const [style, setStyle] = useState<Style>(DEFAULT_STYLE)
  const [past, setPast] = useState<Style[]>([])
  const [future, setFuture] = useState<Style[]>([])
  const initializedBoxStyleIds = useRef(new Set<string>())

  /** 제스처(드래그·슬라이더) 시작 시 한 번만 히스토리에 쌓기 */
  const beginGesture = () => {
    setPast(prev => [...prev, style])
    setFuture([])
  }
  /** 히스토리 없이 실시간 반영 (드래그 중) */
  const live = (patch: Partial<Style>) => setStyle(prev => ({ ...prev, ...patch }))
  /** 단발 변경 (클릭류) — 히스토리 + 반영 */
  const update = (patch: Partial<Style>) => {
    beginGesture()
    live(patch)
  }

  const undo = () => {
    if (past.length === 0) return
    setFuture(prev => [style, ...prev])
    setStyle(past[past.length - 1])
    setPast(prev => prev.slice(0, -1))
  }
  const redo = () => {
    if (future.length === 0) return
    setPast(prev => [...prev, style])
    setStyle(future[0])
    setFuture(prev => prev.slice(1))
  }
  const resetStyle = () => update(DEFAULT_STYLE)

  const [zoom, setZoom] = useState(DEFAULT_ZOOM)
  const [preview, setPreview] = useState(false)
  // 캔버스 위 번역 텍스트 선택 여부 (선택 시에만 초록 편집 박스+핸들 표시)
  const [selected, setSelected] = useState(true)
  // 원문 지우기 영역 선택 여부 — 텍스트와 마찬가지로 선택했을 때만 초록 테두리를 보여준다.
  const [cleanupSelected, setCleanupSelected] = useState(false)
  const [mobileTab, setMobileTab] = useState<MobileTab>('번역')
  const [mobileCanvasTab, setMobileCanvasTab] = useState<MobileCanvasTab>('미리보기')
  const [isInspectorOpen, setIsInspectorOpen] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [exportName, setExportName] = useState('glocalizer_export')
  const [exportFormat, setExportFormat] = useState<'PNG' | 'ZIP'>('ZIP')
  const [ocrDraft, setOcrDraft] = useState('')
  const [selectionMode, setSelectionMode] = useState<SelectionMode | null>(null)
  const [selectionRect, setSelectionRect] = useState<NormalizedRect | null>(null)
  const [selectionDraft, setSelectionDraft] = useState<SelectionDraft | null>(null)
  const [selectionBusy, setSelectionBusy] = useState(false)
  const [selectionSaving, setSelectionSaving] = useState(false)
  const [retryingRegionId, setRetryingRegionId] = useState<string | null>(null)

  const defaultStyleForRegion = (region = activeRegion) => region.normalizedBox
    ? initialStyleFor(region.normalizedBox, region.textColor, region.suggestions, region.recommendedFont)
    : DEFAULT_STYLE

  const saveActiveStyle = (languageCode = activeLanguage.code) => {
    saveStyle(current.id, languageCode, style, activeRegion.id)
  }

  const selectRegion = (regionId: string) => {
    if (regionId === activeRegion.id) return
    saveActiveStyle()
    const region = textRegions.find(candidate => candidate.id === regionId)
    if (!region) return
    const key = styleKeyForRegion(current.id, region.id, current.analysis?.regionId)
    setSelectedRegionId(region.id)
    setStyle(savedStyles[key]?.[activeLanguage.code] ?? defaultStyleForRegion(region))
    setOcrDraft('')
    setPast([])
    setFuture([])
    setSelected(true)
    setCleanupSelected(false)
  }

  const selectItem = (idx: number) => {
    saveActiveStyle()
    setCurrentIdx(idx)
    const next = items[idx]
    const nextRegion = next.textRegions?.[0]
    const nextRegionId = nextRegion?.id ?? next.analysis?.regionId ?? next.id
    const nextKey = styleKeyForRegion(next.id, nextRegionId, next.analysis?.regionId)
    setSelectedRegionId(nextRegionId)
    setStyle(savedStyles[nextKey]?.[activeLanguage.code] ?? (nextRegion?.normalizedBox
      ? initialStyleFor(nextRegion.normalizedBox, nextRegion.textColor, nextRegion.suggestions, nextRegion.recommendedFont)
      : next.analysis?.normalizedBox ? initialStyleFor(next.analysis.normalizedBox, next.analysis.textColor, next.suggestions, next.recommendedFont) : DEFAULT_STYLE))
    setPast([])
    setFuture([])
    setSelected(true)
    setCleanupSelected(false)
    setZoom(DEFAULT_ZOOM)
  }

  useEffect(() => {
    if (!projectStatus || projectStatus.status === 'completed') {
      setIsLoading(false)
      return
    }
    if (projectStatus.status === 'failed') {
      setIsLoading(false)
      toast(projectStatus.message || t.toastAiFailed)
      return
    }

    setIsLoading(true)
    const stepIndex = Math.min(
      LOADING_STEP_COUNT - 1,
      Math.floor((projectStatus.progress / 100) * LOADING_STEP_COUNT),
    )
    setLoadingStep(stepIndex)
    const timer = window.setInterval(() => {
      refreshProject().catch(error => {
        setIsLoading(false)
        toast(error instanceof Error ? error.message : t.toastStatusFail)
      })
    }, 1500)
    return () => window.clearInterval(timer)
  }, [projectStatus, refreshProject, t.toastAiFailed, t.toastStatusFail, toast])

  useEffect(() => {
    const normalizedBox = activeRegion.normalizedBox
    const initializationKey = `${activeStyleKey}:${activeLanguage.code}`
    if (!normalizedBox || savedStyles[activeStyleKey]?.[activeLanguage.code] || initializedBoxStyleIds.current.has(initializationKey)) return
    initializedBoxStyleIds.current.add(initializationKey)
    // 감지된 원본 글자색(textColor)을 번역 텍스트 기본 색으로 함께 적용한다.
    setStyle(initialStyleFor(normalizedBox, activeRegion.textColor, activeRegion.suggestions, activeRegion.recommendedFont))
  }, [activeLanguage.code, activeRegion, activeStyleKey, savedStyles])

  useEffect(() => {
    if (!textRegions.some(region => region.id === selectedRegionId)) {
      setSelectedRegionId(textRegions[0]?.id ?? null)
    }
  }, [selectedRegionId, textRegions])
  // 다음/이전은 이동만 — 완료 표시는 실제 다운로드했을 때만 (아래 markCurrentDone)
  const goNext = () => {
    if (currentIdx < items.length - 1) selectItem(currentIdx + 1)
  }
  const goPrev = () => {
    if (currentIdx > 0) selectItem(currentIdx - 1)
  }
  const markCurrentDone = () =>
    setDoneIds(prev => (prev.includes(current.id) ? prev : [...prev, current.id]))

  /** 리스트에서 이모티콘 삭제. 마지막 항목이면 작업 상태를 비우고 업로드 화면으로 돌아간다. */
  const deleteItem = (idx: number) => {
    const item = items[idx]
    setDoneIds(prev => prev.filter(id => id !== item.id))
    if (items.length === 1) {
      resetWorkflow()
      navigate('/dashboard', { replace: true })
      return
    }
    if (files.length > 0) removeFile(item.id)
    else setRemovedDemoIds(prev => [...prev, item.id])
    if (idx < currentIdx) {
      setCurrentIdx(c => c - 1)
    } else if (idx === currentIdx) {
      setCurrentIdx(Math.min(currentIdx, items.length - 2))
      setStyle(DEFAULT_STYLE)
      setPast([])
      setFuture([])
    }
  }

  /* ── 캔버스 드래그 제스처 (이동 / 크기 / 회전) ───────────────── */

  const boxRef = useRef<HTMLDivElement>(null)
  const cleanupPreviewRef = useRef<HTMLDivElement>(null)
  const originalFrameRef = useRef<HTMLDivElement>(null)
  const selectionStartRef = useRef<{ x: number; y: number } | null>(null)
  // 취소한 뒤 늦게 도착한 OCR 응답이 사라진 선택을 되살리지 않도록 실행 회차를 센다.
  const selectionRunRef = useRef(0)

  const selectionPoint = (event: ReactPointerEvent): { x: number; y: number } | null => {
    const bounds = originalFrameRef.current?.getBoundingClientRect()
    if (!bounds || bounds.width <= 0 || bounds.height <= 0) return null
    return {
      x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)),
      y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)),
    }
  }

  const rectFromPoints = (start: { x: number; y: number }, end: { x: number; y: number }): NormalizedRect => ({
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  })

  const beginAreaSelection = (mode: SelectionMode) => {
    setMobileCanvasTab('원본')
    setSelectionMode(mode)
    setSelectionRect(null)
    setSelectionDraft(null)
    toast(e.selectionHint)
  }

  /** 같은 버튼을 다시 누르면 지정 모드를 끈다. */
  const toggleAreaSelection = (mode: SelectionMode) => {
    if (selectionMode === mode) cancelAreaSelection()
    else beginAreaSelection(mode)
  }

  const startAreaSelection = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!selectionMode || selectionBusy) return
    const point = selectionPoint(event)
    if (!point) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    selectionStartRef.current = point
    setSelectionRect({ x: point.x, y: point.y, width: 0, height: 0 })
  }

  const moveAreaSelection = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = selectionStartRef.current
    if (!selectionMode || !start) return
    const point = selectionPoint(event)
    if (point) setSelectionRect(rectFromPoints(start, point))
  }

  const finishAreaSelection = async (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = selectionStartRef.current
    selectionStartRef.current = null
    if (!selectionMode || !start) return
    const point = selectionPoint(event)
    if (!point) return
    const normalizedBox = rectFromPoints(start, point)
    setSelectionRect(normalizedBox)
    if (normalizedBox.width < 0.02 || normalizedBox.height < 0.02) {
      toast(e.selectionHint)
      return
    }
    const run = ++selectionRunRef.current
    setSelectionBusy(true)
    try {
      const detected = await detectOcrRegion(current.id, normalizedBox)
      if (selectionRunRef.current !== run) return // 기다리는 동안 취소됨
      setSelectionRect(detected.normalizedBox)
      setSelectionDraft({
        mode: selectionMode,
        regionId: selectionMode === 'reselect' ? activeRegion.id : null,
        text: detected.text,
        confidence: detected.confidence,
        normalizedBox: detected.normalizedBox,
      })
    } catch (error) {
      if (selectionRunRef.current !== run) return
      toast(error instanceof Error ? error.message : e.notFoundText)
    } finally {
      if (selectionRunRef.current === run) setSelectionBusy(false)
    }
  }

  const cancelAreaSelection = () => {
    selectionRunRef.current += 1
    selectionStartRef.current = null
    setSelectionMode(null)
    setSelectionRect(null)
    setSelectionDraft(null)
    setSelectionBusy(false)
  }

  const confirmAreaSelection = async () => {
    if (!selectionDraft || !selectionDraft.text.trim()) return
    setSelectionSaving(true)
    try {
      if (selectionDraft.mode === 'reselect' && selectionDraft.regionId) {
        await reviseOcr(current.id, selectionDraft.text.trim(), selectionDraft.normalizedBox, selectionDraft.regionId)
      } else {
        await addOcrRegion(current.id, selectionDraft.text.trim(), selectionDraft.normalizedBox)
      }
      cancelAreaSelection()
    } catch (error) {
      toast(error instanceof Error ? error.message : t.toastAiFailed)
    } finally {
      setSelectionSaving(false)
    }
  }

  const retryActiveTranslation = async () => {
    setRetryingRegionId(activeRegion.id)
    try {
      await retryTranslation(current.id, activeRegion.id, activeLanguage.code)
      await refreshProject()
    } catch (error) {
      toast(error instanceof Error ? error.message : t.toastAiFailed)
    } finally {
      setRetryingRegionId(null)
    }
  }

  const startGesture = (
    e: ReactPointerEvent,
    mode: 'move' | 'resize' | 'rotate',
  ) => {
    if (preview) return
    e.preventDefault()
    e.stopPropagation()
    beginGesture()

    const orig = style
    const scale = zoom / 100
    const rect = boxRef.current?.getBoundingClientRect()
    const cx = rect ? rect.left + rect.width / 2 : e.clientX
    const cy = rect ? rect.top + rect.height / 2 : e.clientY
    const startX = e.clientX
    const startY = e.clientY
    const startAngle = (Math.atan2(startY - cy, startX - cx) * 180) / Math.PI
    const startDist = Math.max(10, Math.hypot(startX - cx, startY - cy))

    // 텍스트 박스가 캔버스 정사각형(320px, 반지름 160)을 벗어나지 않도록 클램프 범위 계산
    const HALF = 160
    const boxHalfW = rect ? rect.width / scale / 2 : 40
    const boxHalfH = rect ? rect.height / scale / 2 : 20
    const maxX = Math.max(10, HALF - boxHalfW)
    const maxY = Math.max(10, HALF - boxHalfH)
    const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v))

    const onMove = (ev: PointerEvent) => {
      if (mode === 'move') {
        // 자유 이동 시 정렬 프리셋 선택 해제
        live({
          x: clamp(Math.round(orig.x + (ev.clientX - startX) / scale), maxX),
          y: clamp(Math.round(orig.y + (ev.clientY - startY) / scale), maxY),
          alignH: null,
          alignV: null,
        })
      } else if (mode === 'resize') {
        const ratio = Math.hypot(ev.clientX - cx, ev.clientY - cy) / startDist
        live({ size: Math.min(96, Math.max(10, Math.round(orig.size * ratio))) })
      } else {
        const angle = (Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180) / Math.PI
        live({ rotation: Math.round(orig.rotation + angle - startAngle) })
      }
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const usingCustom = style.customText.trim().length > 0
  const detectedBox = activeRegion.normalizedBox
  const needsManualOcrReview = activeRegion.needsManualOcrReview
  const manualCleanup = style.manualCleanup
  const cleanupBox = manualCleanup?.rect ?? detectedBox
  const updateManualCleanup = (patch: Partial<ManualCleanup>) => {
    const fallbackRect = detectedBox ?? { x: 0.25, y: 0.25, width: 0.5, height: 0.2 }
    update({ manualCleanup: { mode: 'transparent', rect: fallbackRect, ...manualCleanup, ...patch } })
  }
  const updateManualRect = (patch: Partial<ManualCleanup['rect']>) => {
    const fallbackRect = detectedBox ?? { x: 0.25, y: 0.25, width: 0.5, height: 0.2 }
    const base = manualCleanup?.rect ?? fallbackRect
    const next = { ...base, ...patch }
    const x = Math.min(0.99, Math.max(0, next.x))
    const y = Math.min(0.99, Math.max(0, next.y))
    updateManualCleanup({
      rect: {
        x,
        y,
        width: Math.min(1 - x, Math.max(0.01, next.width)),
        height: Math.min(1 - y, Math.max(0.01, next.height)),
      },
    })
  }
  const startManualCleanupGesture = (event: ReactPointerEvent, mode: 'move' | 'resize') => {
    if (!manualCleanup) return
    event.preventDefault()
    event.stopPropagation()
    const container = cleanupPreviewRef.current?.getBoundingClientRect()
    if (!container) return
    beginGesture()
    const origin = manualCleanup.rect
    const startX = event.clientX
    const startY = event.clientY
    const updateRectLive = (rect: ManualCleanup['rect']) => {
      setStyle(previous => ({ ...previous, manualCleanup: { ...manualCleanup, rect } }))
    }
    const onMove = (moveEvent: PointerEvent) => {
      const deltaX = (moveEvent.clientX - startX) / container.width
      const deltaY = (moveEvent.clientY - startY) / container.height
      if (mode === 'move') {
        const x = Math.min(1 - origin.width, Math.max(0, origin.x + deltaX))
        const y = Math.min(1 - origin.height, Math.max(0, origin.y + deltaY))
        updateRectLive({ ...origin, x, y })
      } else {
        updateRectLive({
          ...origin,
          width: Math.min(1 - origin.x, Math.max(0.01, origin.width + deltaX)),
          height: Math.min(1 - origin.y, Math.max(0.01, origin.height + deltaY)),
        })
      }
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }
  const canvasZoomStyle = {
    transform: `scale(${zoom / 100})`,
    transformOrigin: 'center center',
  }
  const sourceWidth = current.analysis?.width ?? 1
  const sourceHeight = current.analysis?.height ?? 1
  const originalImageFrameStyle = sourceWidth >= sourceHeight
    ? { width: '100%', aspectRatio: `${sourceWidth} / ${sourceHeight}`, transform: `scale(${style.imageScale / 100})` }
    : { height: '100%', aspectRatio: `${sourceWidth} / ${sourceHeight}`, transform: `scale(${style.imageScale / 100})` }

  /* ── 다운로드 ─────────────────────────────────────────────────── */

  const [busy, setBusy] = useState(false)
  const langCode = activeLanguage.code

  const selectLanguage = (languageCode: string) => {
    if (languageCode === activeLanguage.code) return
    saveActiveStyle()
    setActiveLanguageCode(languageCode)
    const localizedRegion = toDemoItems([current], languageCode)[0]?.textRegions?.find(region => region.id === activeRegion.id)
    setStyle(savedStyles[activeStyleKey]?.[languageCode] ?? (localizedRegion?.normalizedBox
      ? initialStyleFor(localizedRegion.normalizedBox, localizedRegion.textColor, localizedRegion.suggestions, localizedRegion.recommendedFont)
      : DEFAULT_STYLE))
    setPast([])
    setFuture([])
  }

  const downloadCurrentPng = async () => {
    setBusy(true)
    try {
      saveActiveStyle(langCode)
      const overlays = textOverlaysForItem(current, langCode, savedStyles, { regionId: activeRegion.id, style })
      downloadBlob(
        await renderItemToPng(current, style, overlays),
        exportFileName(current.name, langCode, 'png'),
      )
      recordDownload('single', langCode)
      markCurrentDone()
      markResultReady()
      navigate('/result')
    } catch (error) {
      toast(error instanceof Error ? error.message : t.toastPngFail)
    } finally {
      setBusy(false)
    }
  }

  const downloadAllZip = async () => {
    setBusy(true)
    try {
      saveActiveStyle(langCode)
      const stylesMap = { ...savedStyles, [activeStyleKey]: { ...savedStyles[activeStyleKey], [langCode]: style } }
      downloadBlob(
        await zipLocalizedItems(
          availableLanguages.map(language => ({ languageCode: language.code, items: toDemoItems(editorFiles, language.code).filter(item => !removedDemoIds.includes(item.id)) })),
          stylesMap,
        ),
        `${exportName.trim() || 'glocalizer_export'}.zip`,
      )
      recordDownload('zip')
      setDoneIds(items.map(i => i.id)) // 전체 다운로드 시 모두 완료
      markResultReady()
      navigate('/result')
    } catch (error) {
      toast(error instanceof Error ? error.message : t.toastZipFail)
    } finally {
      setBusy(false)
    }
  }

  const handleExport = async () => {
    if (exportFormat === 'ZIP') {
      await downloadAllZip()
      return
    }
    setBusy(true)
    try {
      saveActiveStyle(langCode)
      const overlays = textOverlaysForItem(current, langCode, savedStyles, { regionId: activeRegion.id, style })
      downloadBlob(
        await renderItemToPng(current, style, overlays),
        exportFileName(current.name, langCode, 'png'),
      )
      recordDownload('single', langCode)
      markCurrentDone()
      markResultReady()
      navigate('/result')
    } catch (error) {
      toast(error instanceof Error ? error.message : t.toastDownloadFail)
    } finally {
      setBusy(false)
    }
  }

  const textStyleFor = (value: Style): React.CSSProperties => ({
    fontSize: value.size,
    color: value.color,
    fontFamily: `'${value.font}', sans-serif`,
    fontWeight: value.weight,
    WebkitTextStroke: value.strokeOn
      ? `${value.strokeWidth}px ${value.strokeColor}`
      : undefined,
    backgroundColor: value.backgroundOn
      ? hexToRgba(value.backgroundColor, value.backgroundOpacity / 100)
      : undefined,
    padding: value.backgroundOn ? `${value.backgroundPadding}px` : undefined,
    borderRadius: value.backgroundOn ? `${value.backgroundRadius}px` : undefined,
    lineHeight: 1,
    textShadow: value.shadowOn
      ? `${value.shadowX}px ${value.shadowY}px ${value.shadowBlur}px ${hexToRgba(value.shadowColor, value.shadowOpacity / 100)}`
      : undefined,
  })
  const canvasOverlays = textOverlaysForItem(current, langCode, savedStyles, { regionId: activeRegion.id, style })

  const cornerHandles = [
    '-left-1 -top-1 cursor-nwse-resize',
    '-right-1 -top-1 cursor-nesw-resize',
    '-right-1 -bottom-1 cursor-nwse-resize',
    '-left-1 -bottom-1 cursor-nesw-resize',
  ]
  const edgeHandles = [
    'left-1/2 -top-1 -translate-x-1/2',
    '-right-1 top-1/2 -translate-y-1/2',
    'left-1/2 -bottom-1 -translate-x-1/2',
    '-left-1 top-1/2 -translate-y-1/2',
  ]

  /** 설정 패널 탭별 표시 */
  const tabClass = (tab: MobileTab) =>
    mobileTab === tab ? 'block' : 'hidden'

  /* ── 상단 바 도구 (모바일·데스크톱 공용) ──────────────────────── */
  const historyControls = (
    <div className="flex items-center gap-1">
      <button
        onClick={undo}
        disabled={past.length === 0}
        title={e.undo}
        className="flex h-9 w-9 items-center justify-center rounded-xl text-ink transition-colors hover:bg-surface disabled:text-gray-300"
      >
        <Undo2 className="h-4 w-4" />
      </button>
      <button
        onClick={redo}
        disabled={future.length === 0}
        title={e.redo}
        className="flex h-9 w-9 items-center justify-center rounded-xl text-ink transition-colors hover:bg-surface disabled:text-gray-300"
      >
        <Redo2 className="h-4 w-4" />
      </button>
      <button
        onClick={resetStyle}
        title={e.reset}
        className="flex h-9 w-9 items-center justify-center rounded-xl text-ink transition-colors hover:bg-surface"
      >
        <RotateCcw className="h-4 w-4" />
      </button>
    </div>
  )

  const previewControl = (
    <button
      onClick={() => setPreview(p => !p)}
      title={e.preview}
      className={`flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-bold transition-colors ${
        preview ? 'bg-brand-soft text-brand-dark' : 'text-sub hover:bg-surface'
      }`}
    >
      {preview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      {e.preview}
    </button>
  )

  const pngControl = (
    <Button
      variant="secondary"
      size="sm"
      onClick={downloadCurrentPng}
      disabled={busy}
    >
      <Download className="h-4 w-4" /> {e.savePng}
    </Button>
  )

  const inspectorToggle = (
    <button
      onClick={() => setIsInspectorOpen(open => !open)}
      aria-expanded={isInspectorOpen}
      className="hidden h-9 items-center gap-1.5 rounded-xl bg-surface px-3 text-sm font-bold text-ink lg:flex xl:hidden"
    >
      <SlidersHorizontal className="h-4 w-4" /> {e.settings}
    </button>
  )

  // 인식·번역이 끝나기 전에는 에디터 화면(상단 바·언어 탭·파일 목록·설정 패널 등)을 전혀
  // 그리지 않고 로딩 화면만 보여준다 — 전에는 로딩 오버레이가 캔버스 영역에만 떠서 나머지
  // UI가 먼저 다 보이는 문제가 있었다.
  if (files.length === 0 || !projectStatus) {
    return <Navigate to="/dashboard" replace state={{ preserveWorkflow: true }} />
  }

  if (isLoading) {
    return (
      <div className="relative flex min-h-svh flex-col items-center justify-center gap-6 overflow-hidden bg-white px-6 text-center">
        <AuroraBackground />
        <div className="relative z-10">
          <Logo small />
        </div>
        <span className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft">
          <LoaderCircle className="h-7 w-7 animate-spin text-brand-dark" />
        </span>
        <div className="relative z-10">
          <p className="text-xl font-extrabold">{[t.loadingStep1, t.loadingStep2][loadingStep]}</p>
          <p className="mt-2 text-sm font-medium text-sub">
            {t.loadingSub}
          </p>
        </div>
        <div className="relative z-10 h-2 w-full max-w-xs overflow-hidden rounded-full bg-white/70 shadow-[inset_0_0_0_1px_rgba(25,31,40,0.06)]">
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-500"
            style={{ width: `${Math.max(4, projectStatus?.progress ?? 0)}%` }}
          />
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="relative z-10 text-sm font-semibold text-sub hover:underline"
        >
          {t.loadingCancel}
        </button>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-white lg:h-screen">
      {/* 상단 바 */}
      <div className="border-b border-gray-100">
        {availableLanguages.length > 1 && (
          <div className="flex gap-1 overflow-x-auto border-b border-gray-100 px-3 py-2 lg:px-6">
            {availableLanguages.map(language => (
              <button
                key={language.code}
                onClick={() => selectLanguage(language.code)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-extrabold transition-colors ${
                  language.code === activeLanguage.code ? 'bg-brand text-white' : 'bg-surface text-sub hover:bg-brand-soft hover:text-brand-dark'
                }`}
              >
                {language.flag} {language.label}
              </button>
            ))}
          </div>
        )}
        {/* ── 모바일 상단 바 (2줄) ── */}
        <div className="lg:hidden">
          {/* 1줄: 뒤로가기 + 파일명 + 저장 */}
          <div className="flex items-center gap-2 px-3 pt-2.5">
            <button
              onClick={() => navigate('/dashboard')}
              aria-label={e.backToDash}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-extrabold leading-tight">
                {e.aiEditor}{' '}
                <span className="font-semibold text-sub">
                  {currentIdx + 1}/{items.length}
                </span>
              </p>
              <p className="truncate text-[12px] font-semibold text-sub">
                {current.name}
              </p>
            </div>
            <Button
              size="sm"
              onClick={downloadAllZip}
              disabled={busy}
              className="shrink-0"
            >
              <FileArchive className="h-4 w-4" /> {busy ? e.saving : e.save}
            </Button>
          </div>
          {/* 번역 대상 언어 배지 (모바일) */}
          {targetLangs.length > 0 && (
            <div className="px-3 pt-1.5">
              <span className="block truncate rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-bold text-brand-dark">
                {activeLanguage.flag} {activeLanguage.label} {e.editingSuffix}
              </span>
            </div>
          )}
          {/* 2줄: 편집 도구 */}
          <div className="flex items-center gap-1 px-3 pb-2 pt-1.5">
            {historyControls}
            <span className="mx-1 h-5 w-px bg-gray-200" />
            {previewControl}
            <div className="flex-1" />
            {pngControl}
          </div>
        </div>

        {/* ── 데스크톱 상단 바 (1줄) ── */}
        <div className="hidden h-16 items-center gap-3 px-6 lg:flex">
          <Logo small />
          <span className="h-5 w-px bg-gray-200" />
          <span className="text-sm font-semibold text-sub">{current.name}</span>
          {targetLangs.length > 0 && (
            <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-bold text-brand-dark">
              {activeLanguage.flag} {activeLanguage.label} {e.editingSuffix}
            </span>
          )}
          <div className="flex-1" />
          {historyControls}
          <span className="h-5 w-px bg-gray-200" />
          {previewControl}
          {inspectorToggle}
          <span className="h-5 w-px bg-gray-200" />
          {pngControl}
          <Button size="sm" onClick={downloadAllZip} disabled={busy}>
            <FileArchive className="h-4 w-4" />
            {busy ? e.making : e.downloadAllZip}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 flex-col xl:grid xl:grid-cols-[192px_minmax(0,1fr)_288px] xl:overflow-hidden">
        {/* 파일 리스트 — 모바일에선 가로 스트립 */}
        <aside className="flex flex-col border-b border-gray-100 xl:border-b-0 xl:border-r">
          <p className="px-4 pb-2 pt-3 text-xs font-bold text-sub xl:pt-4">
            {e.emojiLabel} {items.length}{e.countUnit} · {e.doneLabel} {doneIds.length}{e.countUnit}
          </p>
          <div className="flex gap-1.5 overflow-x-auto px-2 pb-2 xl:flex-1 xl:flex-col xl:overflow-x-visible xl:overflow-y-auto xl:pb-0">
            {items.map((item, idx) => {
              const active = idx === currentIdx
              const done = doneIds.includes(item.id)
              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => selectItem(idx)}
                  onKeyDown={e => e.key === 'Enter' && selectItem(idx)}
                  className={`group flex w-48 shrink-0 cursor-pointer items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-left transition-colors xl:mb-1.5 xl:w-auto xl:shrink ${
                    active ? 'border-brand bg-brand-soft' : 'border-transparent hover:bg-surface'
                  }`}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface text-xl">
                    {item.url ? (
                      <img src={item.url} alt="" className="h-full w-full object-contain" />
                    ) : (
                      item.emoji
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-bold">
                      {item.name}
                    </span>
                    <span
                      className={`text-[11px] font-semibold ${
                        done ? 'text-brand-dark' : active ? 'text-[#F59E0B]' : 'text-sub'
                      }`}
                    >
                      {done ? e.statusDone : active ? e.statusEditing : e.statusWait}
                    </span>
                  </span>
                  {done && (
                    <Check className="h-4 w-4 shrink-0 text-brand-dark" strokeWidth={3} />
                  )}
                  <button
                    type="button"
                    onClick={event => {
                      event.stopPropagation()
                      deleteItem(idx)
                    }}
                    aria-label={`${item.name}: ${e.deleteEmoji}`}
                    title={e.deleteEmoji}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sub transition-colors hover:bg-red-50 hover:text-[#EF4444] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#EF4444]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )
            })}
          </div>
          {/* 이전 / 다음 (데스크톱) */}
          <div className="hidden gap-2 border-t border-gray-100 p-2.5 xl:flex">
            <Button
              variant="secondary"
              size="sm"
              onClick={goPrev}
              disabled={currentIdx === 0}
              className="flex-1 gap-1 px-2! whitespace-nowrap"
            >
              <ChevronLeft className="h-4 w-4 shrink-0" /> {e.prev}
            </Button>
            <Button
              size="sm"
              onClick={goNext}
              disabled={currentIdx === items.length - 1}
              className="flex-1 gap-1 px-2! whitespace-nowrap"
            >
              {e.next} <ChevronRight className="h-4 w-4 shrink-0" />
            </Button>
          </div>
        </aside>

        {/* 원본 / 변환 미리보기 캔버스 */}
        <section className="relative flex flex-col items-center justify-center gap-4 overflow-hidden bg-surface pb-24 pt-5 lg:gap-5 lg:pb-8 lg:pt-5">
          <div className="flex w-full max-w-[800px] items-center justify-between gap-3 px-5">
            <span className="text-xs font-bold text-sub">
              {activeRegion.korean ? e.foundText : e.enterTextTitle}
            </span>
            <div className="flex shrink-0 gap-1 rounded-xl bg-white p-1">
              {ZOOMS.map(z => (
                <button
                  key={z}
                  onClick={() => setZoom(z)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                    zoom === z ? 'bg-brand-soft text-brand-dark' : 'text-sub hover:bg-surface'
                  }`}
                >
                  {z}%
                </button>
              ))}
              {zoom !== DEFAULT_ZOOM && (
                <button
                  onClick={() => setZoom(DEFAULT_ZOOM)}
                  className="rounded-lg px-2.5 py-1 text-xs font-bold text-sub transition-colors hover:bg-surface hover:text-ink"
                >
                  {e.originalSize}
                </button>
              )}
            </div>
          </div>
          <div className="grid w-full max-w-[760px] grid-cols-2 gap-2 px-4 lg:hidden">
            {(['원본', '미리보기'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setMobileCanvasTab(tab)}
                className={`h-10 rounded-xl text-sm font-bold transition-colors ${
                  mobileCanvasTab === tab
                    ? 'bg-brand text-white'
                    : 'bg-white text-sub'
                }`}
              >
                {tab === '원본' ? e.canvasOriginal : e.canvasPreview}
              </button>
            ))}
          </div>

          <div className="grid w-full max-w-[800px] grid-cols-1 gap-5 px-5 lg:grid-cols-2 lg:gap-6">
            {/* 좌측: 원본과 감지 위치 */}
            <article className={`${mobileCanvasTab === '원본' ? 'block' : 'hidden'} lg:block`}>
              <div className="mb-2 flex h-8 items-center justify-between gap-2">
                <p className="text-sm font-extrabold text-ink">{e.original}</p>
                <div className="flex gap-1">
                  <button
                    onClick={() => toggleAreaSelection('reselect')}
                    aria-pressed={selectionMode === 'reselect'}
                    className={`flex h-8 items-center gap-1 rounded-lg px-2 text-[11px] font-bold transition-colors ${selectionMode === 'reselect' ? 'bg-brand text-white' : 'bg-white text-sub hover:bg-brand-soft hover:text-brand-dark'}`}
                  >
                    <ScanText className="h-3.5 w-3.5" /> {e.reselectArea}
                  </button>
                  <button
                    onClick={() => toggleAreaSelection('add')}
                    aria-pressed={selectionMode === 'add'}
                    className={`flex h-8 items-center gap-1 rounded-lg px-2 text-[11px] font-bold transition-colors ${selectionMode === 'add' ? 'bg-brand text-white' : 'bg-white text-sub hover:bg-brand-soft hover:text-brand-dark'}`}
                  >
                    <Plus className="h-3.5 w-3.5" /> {e.addCaption}
                  </button>
                </div>
              </div>
              <div className="mx-auto h-[320px] w-[320px] overflow-hidden rounded-3xl bg-white sm:h-[340px] sm:w-[340px]">
                <div className="relative flex h-full w-full items-center justify-center transition-transform duration-200" style={canvasZoomStyle}>
                  {current.url ? (
                    <div className="absolute inset-0 flex items-center justify-center p-2">
                      <div
                        ref={originalFrameRef}
                        onPointerDown={startAreaSelection}
                        onPointerMove={moveAreaSelection}
                        onPointerUp={finishAreaSelection}
                        className={`relative touch-none ${selectionMode ? 'cursor-crosshair' : ''}`}
                        style={originalImageFrameStyle}
                      >
                        <img src={current.analysis?.originalUrl ?? current.url} alt={current.name} draggable={false} className="pointer-events-none absolute inset-0 h-full w-full select-none" />
                        {!preview && textRegions.map(region => region.normalizedBox && (
                          <span
                            key={region.id}
                            className={`pointer-events-none absolute border-2 border-dashed ${
                              region.id === activeRegion.id
                                ? 'border-brand bg-brand-soft/20'
                                : 'border-amber-400/80 bg-amber-100/10'
                            }`}
                            style={{
                              left: `${region.normalizedBox.x * 100}%`,
                              top: `${region.normalizedBox.y * 100}%`,
                              width: `${region.normalizedBox.width * 100}%`,
                              height: `${region.normalizedBox.height * 100}%`,
                            }}
                          />
                        ))}
                        {selectionRect && (
                          <span
                            className="pointer-events-none absolute border-2 border-brand bg-brand-soft/25"
                            style={{
                              left: `${selectionRect.x * 100}%`,
                              top: `${selectionRect.y * 100}%`,
                              width: `${selectionRect.width * 100}%`,
                              height: `${selectionRect.height * 100}%`,
                            }}
                          />
                        )}
                        {selectionBusy && (
                          <span className="absolute inset-x-3 top-3 flex items-center justify-center gap-1 rounded-lg bg-white/95 px-2 py-1.5 text-[11px] font-bold text-brand-dark shadow-sm">
                            <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> {e.detectingArea}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <span className="select-none text-[120px]" style={{ transform: `scale(${style.imageScale / 100})` }}>{current.emoji}</span>
                  )}
                </div>
              </div>
              <p className="mt-3 text-center text-xs font-semibold text-sub">
                {selectionMode ? e.selectionHint : activeRegion.korean ? e.foundText : e.notFoundText}
              </p>
            </article>

            {/* 우측: 변환 미리보기와 편집 제스처 */}
            <article className={`${mobileCanvasTab === '미리보기' ? 'block' : 'hidden'} lg:block`}>
              <div className="mb-2 flex h-8 items-center justify-center"><p className="text-sm font-extrabold text-ink">{e.canvasPreview}</p></div>
              <div className="checkerboard mx-auto h-[320px] w-[320px] overflow-hidden rounded-3xl sm:h-[340px] sm:w-[340px]">
                <div ref={cleanupPreviewRef} onPointerDown={() => { setSelected(false); setCleanupSelected(false) }} className="relative flex h-full w-full items-center justify-center transition-transform duration-200" style={canvasZoomStyle}>
                  {current.url ? (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-2">
                      <img src={current.url} alt={`${current.name} 변환 미리보기`} draggable={false} className="h-full w-full select-none object-contain" style={{ transform: `scale(${style.imageScale / 100})` }} />
                    </div>
                  ) : (
                    <span className="select-none text-[120px]" style={{ transform: `scale(${style.imageScale / 100})` }}>{current.emoji}</span>
                  )}
                  {cleanupBox && manualCleanup && (
                    <span
                      onPointerDown={preview ? undefined : event => {
                        setSelected(false)
                        setCleanupSelected(true)
                        startManualCleanupGesture(event, 'move')
                      }}
                      className={`absolute ${preview ? 'pointer-events-none' : `cursor-move${cleanupSelected ? ' border-2 border-brand' : ''}`} ${manualCleanup.mode === 'transparent' ? 'checkerboard' : ''}`}
                      style={{
                        left: `${cleanupBox.x * 100}%`,
                        top: `${cleanupBox.y * 100}%`,
                        width: `${cleanupBox.width * 100}%`,
                        height: `${cleanupBox.height * 100}%`,
                        borderRadius: `${Math.max(0, manualCleanup.radius ?? 0) * 100}%`,
                        backgroundColor: manualCleanup.mode === 'solid' ? manualCleanup.color ?? '#FFFFFF' : undefined,
                      }}
                    >
                      {!preview && cleanupSelected && <span onPointerDown={event => startManualCleanupGesture(event, 'resize')} className="absolute -bottom-1 -right-1 h-3 w-3 cursor-nwse-resize rounded-sm border-2 border-brand bg-white" />}
                    </span>
                  )}
                  {canvasOverlays.map(overlay => {
                    const isActive = overlay.regionId === activeRegion.id
                    const overlayStyle = textStyleFor(overlay.style)
                    const overlayText = resolveText(overlay.style, overlay.suggestions)
                    const transform = `translate(-50%, -50%) translate(${overlay.style.x}px, ${overlay.style.y}px) rotate(${overlay.style.rotation}deg)`

                    return (
                      <div key={overlay.regionId ?? `legacy-${current.id}`} className="absolute left-1/2 top-1/2" style={{ transform }}>
                        {preview || !isActive || !selected ? (
                          <span
                            onPointerDown={preview ? undefined : event => {
                              event.stopPropagation()
                              if (!isActive && overlay.regionId) selectRegion(overlay.regionId)
                              setSelected(true)
                              setCleanupSelected(false)
                            }}
                            className={`select-none whitespace-pre text-center ${preview ? '' : 'cursor-pointer'}`}
                            style={overlayStyle}
                          >
                            {overlayText}
                          </span>
                        ) : (
                          <div ref={boxRef} onPointerDown={event => startGesture(event, 'move')} className="touch-none relative cursor-move border-2 border-brand px-3 py-1">
                            <span className="select-none whitespace-pre text-center" style={overlayStyle}>{overlayText}</span>
                            {cornerHandles.map(pos => <span key={pos} onPointerDown={event => startGesture(event, 'resize')} className={`touch-none absolute h-2.5 w-2.5 rounded-[2px] border-2 border-brand bg-white ${pos}`} />)}
                            {edgeHandles.map(pos => <span key={pos} className={`pointer-events-none absolute h-2 w-2 rounded-[2px] border-2 border-brand bg-white ${pos}`} />)}
                            <span className="pointer-events-none absolute -top-6 left-1/2 h-4 w-px -translate-x-1/2 bg-brand" />
                            <span onPointerDown={event => startGesture(event, 'rotate')} className="touch-none absolute -top-10 left-1/2 flex h-4 w-4 -translate-x-1/2 cursor-grab items-center justify-center rounded-full border-2 border-brand bg-white active:cursor-grabbing" />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
              <p className="mt-3 text-center text-xs font-semibold text-sub">
                {current.url
                  ? current.analysis?.needsManualCleanup
                    ? e.hintManualBg
                    : e.hintComposite
                  : e.hintDrag}
              </p>
            </article>
          </div>

          {/* 이전 / 다음 (모바일 오버레이) */}
          <div className="absolute bottom-14 left-4 flex gap-2 lg:hidden">
            <button
              onClick={goPrev}
              disabled={currentIdx === 0}
              className="rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-ink disabled:text-gray-300"
            >
              ← {e.prev}
            </button>
            <button
              onClick={goNext}
              disabled={currentIdx === items.length - 1}
              className="rounded-xl bg-brand px-3.5 py-2 text-xs font-bold text-white disabled:bg-gray-200 disabled:text-gray-400"
            >
              {e.next} →
            </button>
          </div>

        </section>

        {isInspectorOpen && (
          <button
            aria-label="설정 패널 닫기"
            onClick={() => setIsInspectorOpen(false)}
            className="fixed inset-0 z-30 hidden bg-ink/20 lg:block xl:hidden"
          />
        )}

        {/* 컨트롤 패널 — 중간 화면에서는 슬라이드 패널 */}
        <aside
          className={`relative z-10 -mt-6 flex flex-col gap-7 rounded-t-[28px] bg-white p-6 shadow-[0_-10px_30px_rgba(0,0,0,0.10)] xl:pb-0 lg:fixed lg:inset-y-0 lg:right-0 lg:z-40 lg:mt-0 lg:w-[288px] lg:overflow-y-auto lg:rounded-none lg:border-l lg:border-gray-100 lg:shadow-[0_0_24px_rgba(0,0,0,0.12)] lg:transition-transform xl:static xl:z-auto xl:w-auto xl:translate-x-0 xl:shadow-none ${
            isInspectorOpen ? 'lg:translate-x-0' : 'lg:translate-x-full'
          }`}
        >
          <div className="-mb-2">
            <div className="mx-auto h-1.5 w-10 rounded-full bg-gray-200 lg:hidden" />
            <div className="mt-4 grid grid-cols-3 gap-2 lg:mt-0">
              {(['번역', '폰트', '스타일'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setMobileTab(tab)}
                  className={`h-10 rounded-xl border-2 text-sm font-bold transition-colors ${
                    mobileTab === tab
                      ? 'border-brand bg-brand-soft text-brand-dark'
                      : 'border-gray-100 bg-white text-sub'
                  }`}
                >
                  {tab === '번역' ? e.tabTranslate : tab === '폰트' ? e.tabFont : e.tabStyle}
                </button>
              ))}
            </div>
            <button
              onClick={() => setIsInspectorOpen(false)}
              aria-label="설정 패널 닫기"
              className="absolute right-4 top-4 hidden rounded-xl p-2 text-sub hover:bg-surface lg:block xl:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* ── 번역 탭 ── */}
          <section className={tabClass('번역')}>
            {textRegions.length > 1 && (
              <div className="mb-4">
                <p className="mb-2 text-xs font-extrabold text-ink">{e.detectedCaptions}</p>
                <div className="flex max-h-36 flex-col gap-1.5 overflow-y-auto">
                  {textRegions.map((region, index) => (
                    <button
                      key={region.id}
                      onClick={() => selectRegion(region.id)}
                      className={`flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-bold transition-colors ${
                        activeRegion.id === region.id
                          ? 'border-brand bg-brand-soft text-brand-dark'
                          : 'border-gray-100 bg-white text-ink hover:border-gray-200'
                      }`}
                    >
                      <span className="w-5 shrink-0 text-center text-[11px] text-sub">{index + 1}</span>
                      <span className="min-w-0 flex-1 truncate">{region.korean}</span>
                      {region.translationStatus === 'failed' && (
                        <span className="shrink-0 rounded-md bg-red-50 px-1.5 py-0.5 text-[9px] text-red-600">{e.translationNeeded}</span>
                      )}
                      {(region.needsManualCleanup || region.needsManualOcrReview) && (
                        <span className="shrink-0 rounded-md bg-amber-100 px-1.5 py-0.5 text-[9px] text-amber-700">{e.captionReview}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className={`mb-4 rounded-xl border p-3 ${needsManualOcrReview ? 'border-amber-200 bg-amber-50' : 'border-gray-100 bg-surface'}`}>
              <p className="text-xs font-extrabold">{e.ocrEditTitle} {needsManualOcrReview && <span className="text-amber-700">{e.ocrNeedCheck}</span>}</p>
              <p className="mt-1 text-[11px] text-sub">{e.ocrEditHint}</p>
              <input value={ocrDraft || activeRegion.korean} onChange={event => setOcrDraft(event.target.value)} className="mt-2 h-9 w-full rounded-lg border border-gray-200 bg-white px-2 text-sm font-semibold outline-none focus:border-brand" />
              <button onClick={() => { if (detectedBox) void reviseOcr(current.id, ocrDraft || activeRegion.korean, detectedBox, activeRegion.id).then(() => { setOcrDraft(''); refreshProject() }) }} disabled={!detectedBox || !(ocrDraft || activeRegion.korean).trim()} className="mt-2 rounded-lg bg-brand px-3 py-1.5 text-xs font-extrabold text-white disabled:opacity-40">{e.ocrResave}</button>
            </div>
            <PanelTitle>{e.aiSuggest}</PanelTitle>
            {activeRegion.translationStatus === 'failed' && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-semibold text-amber-800">{e.translationMissing}</p>
                <button
                  onClick={() => void retryActiveTranslation()}
                  disabled={retryingRegionId === activeRegion.id}
                  className="mt-2 flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3 text-xs font-extrabold text-white disabled:opacity-50"
                >
                  {retryingRegionId === activeRegion.id && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
                  {retryingRegionId === activeRegion.id ? e.retryingTranslation : e.retryTranslation}
                </button>
              </div>
            )}
            <div className="mt-3 flex flex-col gap-2">
              {activeRegion.suggestions.map((sug, i) => {
                const active = !usingCustom && style.suggestion === i
                return (
                  <button
                    key={sug.text}
                    onClick={() => update({ suggestion: i, customText: '' })}
                    className={`flex items-center gap-2.5 rounded-2xl border-2 px-4 py-3 text-left transition-colors ${
                      active
                        ? 'border-brand bg-brand-soft'
                        : 'border-gray-100 bg-white hover:border-gray-200'
                    }`}
                  >
                    <span className="flex-1">
                      <span className="flex items-center gap-1.5">
                        {sug.best && (
                          <span className="rounded-md bg-brand px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                            BEST
                          </span>
                        )}
                        <span className="text-[11px] font-semibold text-sub">
                          {sug.tone}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-[15px] font-bold">{sug.text}</span>
                    </span>
                    {active && (
                      <Check className="h-4 w-4 shrink-0 text-brand-dark" strokeWidth={3} />
                    )}
                  </button>
                )
              })}
            </div>
            {/* 직접 입력 */}
            <p className="mt-4 text-[11px] font-semibold text-sub">
              {e.customHint}
            </p>
            <textarea
              value={style.customText}
              onFocus={beginGesture}
              onChange={e => live({ customText: e.target.value })}
              placeholder={e.customPlaceholder}
              rows={3}
              className={`mt-2 min-h-20 w-full resize-y rounded-xl border-2 px-3 py-2 text-[15px] font-semibold outline-none transition-colors ${
                usingCustom
                  ? 'border-brand bg-brand-soft'
                  : 'border-gray-100 bg-white focus:border-brand'
              }`}
            />
          </section>

          {/* ── 폰트 탭 ── */}
          <section className={tabClass('폰트')}>
            <PanelTitle>{e.font}</PanelTitle>
            {/* AI 폰트 추천 — 원본 글씨체 기반 (API 연동 전 데모) */}
            {style.font !== activeRegion.recommendedFont && (
              <button
                onClick={() =>
                  update({
                    font: activeRegion.recommendedFont,
                    weight: clampWeight(activeRegion.recommendedFont, style.weight),
                  })
                }
                className="mt-3 flex w-full items-center gap-2 rounded-2xl border-2 border-dashed border-brand/40 bg-brand-soft/60 px-4 py-2.5 text-left transition-colors hover:border-brand"
              >
                <Sparkles className="h-4 w-4 shrink-0 text-brand-dark" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold text-sub">
                    {e.fontAiRec}
                  </span>
                  <span
                    className="block truncate text-[15px] font-bold text-brand-dark"
                    style={{ fontFamily: `'${activeRegion.recommendedFont}', sans-serif` }}
                  >
                    {activeRegion.recommendedFont}
                  </span>
                </span>
                <span className="shrink-0 rounded-lg bg-brand px-2.5 py-1 text-xs font-bold text-white">
                  {e.apply}
                </span>
              </button>
            )}
            <select
              value={style.font}
              onChange={e =>
                update({
                  font: e.target.value,
                  weight: clampWeight(e.target.value, style.weight),
                })
              }
              className="mt-3 h-11 w-full rounded-xl border-2 border-gray-100 bg-white px-3 text-[15px] font-semibold outline-none focus:border-brand"
            >
              {FONT_NAMES.map(f => (
                <option key={f} value={f} style={{ fontFamily: `'${f}', sans-serif` }}>
                  {f}
                  {f === activeRegion.recommendedFont ? ` ${e.recSuffix}` : ''}
                </option>
              ))}
            </select>
          </section>

          <section className={tabClass('폰트')}>
            <PanelTitle>{e.weight}</PanelTitle>
            {(() => {
              const nativeWeights = fontWeights(style.font)
              // 폰트가 다중 굵기를 지원하면 그 값을, 단일 굵기면 표준 굵기(합성 볼드)를 노출해
              // 어떤 폰트든 사용자가 굵기를 조절할 수 있게 한다.
              const weights = nativeWeights.length > 1 ? nativeWeights : CUSTOM_WEIGHTS
              const cols = weights.length === 2 ? 'grid-cols-2' : 'grid-cols-4'
              return (
                <div className={`mt-3 grid gap-1.5 ${cols}`}>
                  {weights.map(w => (
                    <button
                      key={w.value}
                      onClick={() => update({ weight: w.value })}
                      className={`h-9 rounded-xl border-2 text-xs font-bold transition-colors ${
                        style.weight === w.value
                          ? 'border-brand bg-brand-soft text-brand-dark'
                          : 'border-gray-100 bg-white text-sub hover:border-gray-200'
                      }`}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              )
            })()}
          </section>

          <section className={tabClass('폰트')}>
            <PanelTitle>{e.sizeRotation}</PanelTitle>
            <div className="mt-3 flex flex-col gap-3">
              <RangeRow
                label={e.size}
                min={10}
                max={96}
                value={style.size}
                suffix="px"
                onBegin={beginGesture}
                onLive={v => live({ size: v })}
              />
              <RangeRow
                label={e.rotation}
                min={-180}
                max={180}
                value={style.rotation}
                suffix="°"
                onBegin={beginGesture}
                onLive={v => live({ rotation: v })}
              />
            </div>
          </section>

          {/* ── 스타일 탭 ── */}
          <section className={tabClass('스타일')}>
            <PanelTitle>{e.textColor}</PanelTitle>
            <div className="mt-3">
              <ColorRow
                value={style.color}
                pickColorTitle={e.pickColor}
                presets={COLORS}
                onBegin={beginGesture}
                onLive={c => live({ color: c })}
                onPick={c => update({ color: c })}
              />
            </div>
          </section>

          <section className={tabClass('스타일')}>
            <div className="flex items-center justify-between">
              <PanelTitle>{e.textBg}</PanelTitle>
              <Toggle
                on={style.backgroundOn}
                onToggle={() => update({ backgroundOn: !style.backgroundOn })}
              />
            </div>
            {style.backgroundOn && (
              <div className="mt-3 flex flex-col gap-3">
                <ColorRow
                  value={style.backgroundColor}
                  pickColorTitle={e.pickColor}
                  presets={['#FFFFFF', '#191F28', '#22C55E', '#FDE047']}
                  onBegin={beginGesture}
                  onLive={c => live({ backgroundColor: c })}
                  onPick={c => update({ backgroundColor: c })}
                />
                <RangeRow
                  label={e.opacity}
                  min={0}
                  max={100}
                  value={style.backgroundOpacity}
                  suffix="%"
                  onBegin={beginGesture}
                  onLive={v => live({ backgroundOpacity: v })}
                />
                <RangeRow
                  label={e.padding}
                  min={0}
                  max={24}
                  value={style.backgroundPadding}
                  suffix="px"
                  onBegin={beginGesture}
                  onLive={v => live({ backgroundPadding: v })}
                />
                <RangeRow
                  label={e.corner}
                  min={0}
                  max={32}
                  value={style.backgroundRadius}
                  suffix="px"
                  onBegin={beginGesture}
                  onLive={v => live({ backgroundRadius: v })}
                />
              </div>
            )}
          </section>

          <section className={tabClass('스타일')}>
            <div className="flex items-center justify-between">
              <PanelTitle>{e.stroke}</PanelTitle>
              <Toggle
                on={style.strokeOn}
                onToggle={() => update({ strokeOn: !style.strokeOn })}
              />
            </div>
            {style.strokeOn && (
              <div className="mt-3 flex flex-col gap-3">
                <RangeRow
                  label={e.weight}
                  min={1}
                  max={6}
                  value={style.strokeWidth}
                  suffix="px"
                  onBegin={beginGesture}
                  onLive={v => live({ strokeWidth: v })}
                />
                <ColorRow
                  value={style.strokeColor}
                  pickColorTitle={e.pickColor}
                  presets={['#FFFFFF', '#191F28', '#22C55E']}
                  onBegin={beginGesture}
                  onLive={c => live({ strokeColor: c })}
                  onPick={c => update({ strokeColor: c })}
                />
              </div>
            )}
          </section>

          <section className={tabClass('스타일')}>
            <div className="flex items-center justify-between">
              <PanelTitle>{e.shadow}</PanelTitle>
              <Toggle
                on={style.shadowOn}
                onToggle={() => update({ shadowOn: !style.shadowOn })}
              />
            </div>
            {style.shadowOn && (
              <div className="mt-3 flex flex-col gap-3">
                <ColorRow
                  value={style.shadowColor}
                  pickColorTitle={e.pickColor}
                  presets={['#000000', '#191F28', '#22C55E']}
                  onBegin={beginGesture}
                  onLive={c => live({ shadowColor: c })}
                  onPick={c => update({ shadowColor: c })}
                />
                <RangeRow
                  label={e.blur}
                  min={0}
                  max={30}
                  value={style.shadowBlur}
                  suffix="px"
                  onBegin={beginGesture}
                  onLive={v => live({ shadowBlur: v })}
                />
                <RangeRow
                  label={e.horizontal}
                  min={-20}
                  max={20}
                  value={style.shadowX}
                  suffix="px"
                  onBegin={beginGesture}
                  onLive={v => live({ shadowX: v })}
                />
                <RangeRow
                  label={e.vertical}
                  min={-20}
                  max={20}
                  value={style.shadowY}
                  suffix="px"
                  onBegin={beginGesture}
                  onLive={v => live({ shadowY: v })}
                />
                {/* 투명도: 0% = 진한 그림자, 100% = 안 보임 (내부 opacity는 반전 저장) */}
                <RangeRow
                  label={e.transparency}
                  min={0}
                  max={100}
                  value={100 - style.shadowOpacity}
                  suffix="%"
                  onBegin={beginGesture}
                  onLive={v => live({ shadowOpacity: 100 - v })}
                />
              </div>
            )}
          </section>

          <section className={tabClass('스타일')}>
            <PanelTitle>{e.align}</PanelTitle>
            {/* 가로 정렬 — 한 번 더 누르면 선택 해제 */}
            <div className="mt-3 flex items-center gap-2">
              <span className="w-8 shrink-0 text-xs font-semibold text-sub">{e.horizontal}</span>
              <div className="grid flex-1 grid-cols-3 gap-1.5">
                {(
                  [
                    ['left', e.alignLeft],
                    ['center', e.alignCenter],
                    ['right', e.alignRight],
                  ] as const
                ).map(([key, label]) => {
                  const active = style.alignH === key
                  return (
                    <button
                      key={key}
                      onClick={() =>
                        update(
                          active
                            ? { alignH: null }
                            : { alignH: key, x: ALIGN_X[key] },
                        )
                      }
                      className={`h-9 rounded-xl border-2 text-xs font-bold transition-colors ${
                        active
                          ? 'border-brand bg-brand-soft text-brand-dark'
                          : 'border-gray-100 bg-white text-sub hover:border-gray-200'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
            {/* 세로 정렬 */}
            <div className="mt-2 flex items-center gap-2">
              <span className="w-8 shrink-0 text-xs font-semibold text-sub">{e.vertical}</span>
              <div className="grid flex-1 grid-cols-3 gap-1.5">
                {(
                  [
                    ['top', e.alignTop],
                    ['middle', e.alignCenter],
                    ['bottom', e.alignBottom],
                  ] as const
                ).map(([key, label]) => {
                  const active = style.alignV === key
                  return (
                    <button
                      key={key}
                      onClick={() =>
                        update(
                          active
                            ? { alignV: null }
                            : { alignV: key, y: ALIGN_Y[key] },
                        )
                      }
                      className={`h-9 rounded-xl border-2 text-xs font-bold transition-colors ${
                        active
                          ? 'border-brand bg-brand-soft text-brand-dark'
                          : 'border-gray-100 bg-white text-sub hover:border-gray-200'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          </section>

          {/* 원본 이미지 크기 */}
          {current.url && (
            <section className={tabClass('스타일')}>
              <PanelTitle>{e.imageSize}</PanelTitle>
              <div className="mt-3">
                <RangeRow
                  label={e.size}
                  min={50}
                  max={150}
                  value={style.imageScale}
                  suffix="%"
                  onBegin={beginGesture}
                  onLive={v => live({ imageScale: v })}
                />
              </div>
            </section>
          )}

          <section className={tabClass('스타일')}>
            <PanelTitle>{e.background}</PanelTitle>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {(
                [
                  [true, e.bgTransparent],
                  [false, e.bgWhite],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={label}
                  onClick={() => update({ transparent: value })}
                  className={`h-10 rounded-xl border-2 text-sm font-bold transition-colors ${
                    style.transparent === value
                      ? 'border-brand bg-brand-soft text-brand-dark'
                      : 'border-gray-100 bg-white text-sub hover:border-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          <section className={tabClass('스타일')}>
            <div className="flex items-center justify-between">
              <PanelTitle>{e.eraseOriginal}</PanelTitle>
              <Toggle
                on={Boolean(manualCleanup)}
                onToggle={() => {
                  if (manualCleanup) {
                    update({ manualCleanup: undefined })
                    setCleanupSelected(false)
                  } else {
                    updateManualCleanup({})
                    setSelected(false)
                    setCleanupSelected(true)
                  }
                }}
              />
            </div>
            <p className="mt-2 text-xs font-semibold text-sub">
              {current.analysis?.needsManualCleanup ? e.eraseHintManual : e.eraseHintAuto}
            </p>
            {manualCleanup && (
              // 이 안의 컨트롤을 건드리면 지우기 영역을 선택 상태로 만들어 초록 테두리를 띄운다.
              <div
                onPointerDown={() => { setSelected(false); setCleanupSelected(true) }}
                className="mt-3 flex flex-col gap-3"
              >
                <div className="grid grid-cols-2 gap-2">
                  {(['transparent', 'solid'] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => updateManualCleanup({ mode })}
                      className={`h-10 rounded-xl border-2 text-sm font-bold ${manualCleanup.mode === mode ? 'border-brand bg-brand-soft text-brand-dark' : 'border-gray-100 text-sub'}`}
                    >
                      {mode === 'transparent' ? e.eraseTransparent : e.eraseSolid}
                    </button>
                  ))}
                </div>
                {manualCleanup.mode === 'solid' && (
                  <label className="flex items-center justify-between text-xs font-bold text-sub">
                    {e.bgColor}
                    <input type="color" value={manualCleanup.color ?? '#FFFFFF'} onChange={event => updateManualCleanup({ color: event.target.value })} />
                  </label>
                )}
                <RangeRow label={e.cornerRound} min={0} max={50} value={Math.round((manualCleanup.radius ?? 0) * 100)} suffix="%" onBegin={beginGesture} onLive={value => updateManualCleanup({ radius: value / 100 })} />
                <RangeRow label={e.posX} min={0} max={100} value={Math.round(manualCleanup.rect.x * 100)} suffix="%" onBegin={beginGesture} onLive={value => updateManualRect({ x: value / 100 })} />
                <RangeRow label={e.posY} min={0} max={100} value={Math.round(manualCleanup.rect.y * 100)} suffix="%" onBegin={beginGesture} onLive={value => updateManualRect({ y: value / 100 })} />
                <RangeRow label={e.sizeX} min={1} max={100} value={Math.round(manualCleanup.rect.width * 100)} suffix="%" onBegin={beginGesture} onLive={value => updateManualRect({ width: value / 100 })} />
                <RangeRow label={e.sizeY} min={1} max={100} value={Math.round(manualCleanup.rect.height * 100)} suffix="%" onBegin={beginGesture} onLive={value => updateManualRect({ height: value / 100 })} />
              </div>
            )}
          </section>

          {/* ── 내보내기 (모바일에선 항상 표시) ── */}
          <section className="mt-auto border-t border-gray-100 bg-white pt-6 xl:sticky xl:bottom-0 xl:pb-6">
            <PanelTitle>{e.exportTitle}</PanelTitle>
            <input
              value={exportName}
              onChange={e => setExportName(e.target.value)}
              className="mt-3 h-11 w-full rounded-xl border-2 border-gray-100 bg-white px-3 text-[14px] font-semibold outline-none focus:border-brand"
            />
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {(['PNG', 'ZIP'] as const).map(fmt => (
                <button
                  key={fmt}
                  onClick={() => setExportFormat(fmt)}
                  className={`flex h-9 items-center justify-center gap-1.5 rounded-xl border-2 text-xs font-bold transition-colors ${
                    exportFormat === fmt
                      ? 'border-brand bg-brand-soft text-brand-dark'
                      : 'border-gray-100 bg-white text-sub hover:border-gray-200'
                  }`}
                >
                  {fmt === 'PNG'
                    ? <ImageDown className="h-4 w-4 shrink-0" />
                    : <FileArchive className="h-4 w-4 shrink-0" />}
                  {fmt}
                </button>
              ))}
            </div>
            <p className="mt-4 text-xs font-semibold text-sub underline decoration-gray-300 underline-offset-4">
              {e.aiLocalizationApplied}
            </p>
            <Button className="mt-3 w-full" glow onClick={handleExport} disabled={busy}>
              <Download className="h-4 w-4" /> {busy ? e.making : e.download}
            </Button>
          </section>
        </aside>
      </div>

      {selectionDraft && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-ink/25 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold text-ink">{e.detectedAreaTitle}</h2>
                <p className="mt-1 text-xs font-semibold text-sub">{Math.round(selectionDraft.confidence * 100)}%</p>
              </div>
              <button onClick={cancelAreaSelection} className="rounded-lg p-2 text-sub hover:bg-surface" aria-label={e.cancelArea}><X className="h-4 w-4" /></button>
            </div>
            <textarea
              value={selectionDraft.text}
              onChange={event => setSelectionDraft(previous => previous ? { ...previous, text: event.target.value } : previous)}
              rows={4}
              className="mt-4 w-full resize-none rounded-xl border-2 border-gray-100 px-3 py-2 text-sm font-semibold outline-none focus:border-brand"
            />
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={cancelAreaSelection} className="h-11 rounded-xl border-2 border-gray-100 text-sm font-bold text-sub">{e.cancelArea}</button>
              <button onClick={() => void confirmAreaSelection()} disabled={selectionSaving || !selectionDraft.text.trim()} className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-brand text-sm font-extrabold text-white disabled:opacity-50">
                {selectionSaving && <LoaderCircle className="h-4 w-4 animate-spin" />}{e.confirmArea}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
