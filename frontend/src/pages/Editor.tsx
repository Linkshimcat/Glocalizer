import {
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  FileArchive,
  LoaderCircle,
  Redo2,
  RotateCcw,
  Sparkles,
  SlidersHorizontal,
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
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Logo from '../components/Logo'
import { useToast } from '../components/Toast'
import {
  COLORS,
  FONT_NAMES,
  clampWeight,
  fontWeights,
  isGif,
  toDemoItems,
} from '../data/demo'
import {
  downloadBlob,
  exportFileName,
  renderItemToPng,
  zipLocalizedItems,
} from '../lib/exportImage'
import { DEFAULT_STYLE, hexToRgba, resolveText, styleFromNormalizedBox, type ManualCleanup, type Style } from '../lib/style'
import { useUploads } from '../store/uploads'

const ALIGN_X = { left: -95, center: 0, right: 95 } as const
const ALIGN_Y = { top: -105, middle: 0, bottom: 105 } as const
const ZOOMS = [50, 100, 200]
const DEFAULT_ZOOM = 100

type MobileTab = '번역' | '폰트' | '스타일'
type MobileCanvasTab = '원본' | '미리보기'

const DEMO_LOADING_STEPS = [
  '한글을 찾고 있어요…',
  '자연스러운 표현을 고르고 있어요…',
] as const

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
}

/** 프리셋 스와치 + 스펙트럼 커스텀 피커 */
function ColorRow({ value, presets, onBegin, onLive, onPick }: ColorRowProps) {
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
        title="원하는 색 직접 고르기"
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
    targetLangs,
    styles: savedStyles,
    saveStyle,
    projectStatus,
    refreshProject,
    reviseOcr,
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
  const [doneIds, setDoneIds] = useState<string[]>([])

  // 텍스트 감지 실패 시 경고 토스트 (이모티콘당 1회)
  const toast = useToast()
  const warnedIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (!current.korean && warnedIdRef.current !== current.id) {
      warnedIdRef.current = current.id
      toast('현재 이모티콘에서 텍스트를 감지하지 못했어요!')
    }
  }, [current.id, current.korean, toast])

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
  const [mobileTab, setMobileTab] = useState<MobileTab>('번역')
  const [mobileCanvasTab, setMobileCanvasTab] = useState<MobileCanvasTab>('미리보기')
  const [isInspectorOpen, setIsInspectorOpen] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [exportName, setExportName] = useState('glocalizer_export')
  const [exportFormat, setExportFormat] = useState<'PNG' | 'GIF' | 'ZIP'>('ZIP')
  const [ocrDraft, setOcrDraft] = useState('')

  const selectItem = (idx: number) => {
    saveStyle(current.id, activeLanguage.code, style)
    setCurrentIdx(idx)
    setStyle(savedStyles[items[idx].id]?.[activeLanguage.code] ?? (items[idx].analysis?.normalizedBox ? styleFromNormalizedBox(items[idx].analysis.normalizedBox) : DEFAULT_STYLE))
    setPast([])
    setFuture([])
    setSelected(true)
    setZoom(DEFAULT_ZOOM)
    if (!isGif(items[idx])) setExportFormat(f => (f === 'GIF' ? 'ZIP' : f))
  }

  useEffect(() => {
    if (!projectStatus || projectStatus.status === 'completed') {
      setIsLoading(false)
      return
    }
    if (projectStatus.status === 'failed') {
      setIsLoading(false)
      toast(projectStatus.message || 'AI 처리에 실패했어요. 새 작업으로 다시 시도해주세요.')
      return
    }

    setIsLoading(true)
    const stepIndex = Math.min(
      DEMO_LOADING_STEPS.length - 1,
      Math.floor((projectStatus.progress / 100) * DEMO_LOADING_STEPS.length),
    )
    setLoadingStep(stepIndex)
    const timer = window.setInterval(() => {
      refreshProject().catch(error => {
        setIsLoading(false)
        toast(error instanceof Error ? error.message : '처리 상태를 확인하지 못했어요.')
      })
    }, 1500)
    return () => window.clearInterval(timer)
  }, [projectStatus, refreshProject, toast])

  useEffect(() => {
    const normalizedBox = current.analysis?.normalizedBox
    const styleKey = `${current.id}:${activeLanguage.code}`
    if (!normalizedBox || savedStyles[current.id]?.[activeLanguage.code] || initializedBoxStyleIds.current.has(styleKey)) return
    initializedBoxStyleIds.current.add(styleKey)
    setStyle(styleFromNormalizedBox(normalizedBox))
  }, [activeLanguage.code, current, savedStyles])
  // 다음/이전은 이동만 — 완료 표시는 실제 다운로드했을 때만 (아래 markCurrentDone)
  const goNext = () => {
    if (currentIdx < items.length - 1) selectItem(currentIdx + 1)
  }
  const goPrev = () => {
    if (currentIdx > 0) selectItem(currentIdx - 1)
  }
  const markCurrentDone = () =>
    setDoneIds(prev => (prev.includes(current.id) ? prev : [...prev, current.id]))

  /** 리스트에서 이모티콘 삭제 (마지막 1장은 유지) */
  const deleteItem = (idx: number) => {
    if (items.length <= 1) return
    const item = items[idx]
    setDoneIds(prev => prev.filter(id => id !== item.id))
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
  const suggestionText = resolveText(style, current.suggestions)
  const detectedBox = current.analysis?.normalizedBox ?? null
  const needsManualOcrReview = current.analysis?.needsManualOcrReview ?? false
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
  const gifOk = isGif(current)
  const canvasZoomStyle = {
    transform: `scale(${zoom / 100})`,
    transformOrigin: 'center center',
  }

  /* ── 다운로드 ─────────────────────────────────────────────────── */

  const [busy, setBusy] = useState(false)
  const langCode = activeLanguage.code

  const selectLanguage = (languageCode: string) => {
    if (languageCode === activeLanguage.code) return
    saveStyle(current.id, activeLanguage.code, style)
    setActiveLanguageCode(languageCode)
    setStyle(savedStyles[current.id]?.[languageCode] ?? (current.analysis?.normalizedBox ? styleFromNormalizedBox(current.analysis.normalizedBox) : DEFAULT_STYLE))
    setPast([])
    setFuture([])
  }

  const downloadCurrentPng = async () => {
    setBusy(true)
    try {
      saveStyle(current.id, langCode, style)
      downloadBlob(
        await renderItemToPng(current, style),
        exportFileName(current.name, langCode, 'png'),
      )
      markCurrentDone()
      navigate('/result')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'PNG 다운로드에 실패했어요.')
    } finally {
      setBusy(false)
    }
  }

  const downloadAllZip = async () => {
    setBusy(true)
    try {
      saveStyle(current.id, langCode, style)
      const stylesMap = { ...savedStyles, [current.id]: { ...savedStyles[current.id], [langCode]: style } }
      downloadBlob(
        await zipLocalizedItems(
          availableLanguages.map(language => ({ languageCode: language.code, items: toDemoItems(editorFiles, language.code).filter(item => !removedDemoIds.includes(item.id)) })),
          stylesMap,
        ),
        `${exportName.trim() || 'glocalizer_export'}.zip`,
      )
      setDoneIds(items.map(i => i.id)) // 전체 다운로드 시 모두 완료
      navigate('/result')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'ZIP 다운로드에 실패했어요.')
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
      saveStyle(current.id, langCode, style)
      if (exportFormat === 'PNG') {
        downloadBlob(
          await renderItemToPng(current, style),
          exportFileName(current.name, langCode, 'png'),
        )
      } else if (current.url) {
        // GIF: 원본 애니메이션 파일 그대로 저장 (프레임별 텍스트 합성은 백엔드 연동 시)
        downloadBlob(
          await fetch(current.url).then(r => r.blob()),
          exportFileName(current.name, langCode, 'gif'),
        )
      }
      markCurrentDone()
      navigate('/result')
    } catch (error) {
      toast(error instanceof Error ? error.message : '다운로드에 실패했어요.')
    } finally {
      setBusy(false)
    }
  }

  const overlayTextStyle: React.CSSProperties = {
    fontSize: style.size,
    color: style.color,
    fontFamily: `'${style.font}', sans-serif`,
    fontWeight: style.weight,
    WebkitTextStroke: style.strokeOn
      ? `${style.strokeWidth}px ${style.strokeColor}`
      : undefined,
    backgroundColor: style.backgroundOn
      ? hexToRgba(style.backgroundColor, style.backgroundOpacity / 100)
      : undefined,
    padding: style.backgroundOn ? `${style.backgroundPadding}px` : undefined,
    borderRadius: style.backgroundOn ? `${style.backgroundRadius}px` : undefined,
    lineHeight: 1,
    textShadow: style.shadowOn
      ? `${style.shadowX}px ${style.shadowY}px ${style.shadowBlur}px ${hexToRgba(style.shadowColor, style.shadowOpacity / 100)}`
      : undefined,
  }

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
        title="실행 취소"
        className="flex h-9 w-9 items-center justify-center rounded-xl text-ink transition-colors hover:bg-surface disabled:text-gray-300"
      >
        <Undo2 className="h-4 w-4" />
      </button>
      <button
        onClick={redo}
        disabled={future.length === 0}
        title="다시 실행"
        className="flex h-9 w-9 items-center justify-center rounded-xl text-ink transition-colors hover:bg-surface disabled:text-gray-300"
      >
        <Redo2 className="h-4 w-4" />
      </button>
      <button
        onClick={resetStyle}
        title="초기화"
        className="flex h-9 w-9 items-center justify-center rounded-xl text-ink transition-colors hover:bg-surface"
      >
        <RotateCcw className="h-4 w-4" />
      </button>
    </div>
  )

  const previewControl = (
    <button
      onClick={() => setPreview(p => !p)}
      title="미리보기"
      className={`flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-bold transition-colors ${
        preview ? 'bg-brand-soft text-brand-dark' : 'text-sub hover:bg-surface'
      }`}
    >
      {preview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      미리보기
    </button>
  )

  const pngControl = (
    <Button
      variant="secondary"
      size="sm"
      onClick={downloadCurrentPng}
      disabled={busy}
    >
      <Download className="h-4 w-4" /> PNG 저장
    </Button>
  )

  const inspectorToggle = (
    <button
      onClick={() => setIsInspectorOpen(open => !open)}
      aria-expanded={isInspectorOpen}
      className="hidden h-9 items-center gap-1.5 rounded-xl bg-surface px-3 text-sm font-bold text-ink lg:flex xl:hidden"
    >
      <SlidersHorizontal className="h-4 w-4" /> 설정
    </button>
  )

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
              aria-label="대시보드로 돌아가기"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-extrabold leading-tight">
                AI 에디터{' '}
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
              <FileArchive className="h-4 w-4" /> {busy ? '저장 중…' : '저장'}
            </Button>
          </div>
          {/* 번역 대상 언어 배지 (모바일) */}
          {targetLangs.length > 0 && (
            <div className="px-3 pt-1.5">
              <span className="block truncate rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-bold text-brand-dark">
                {activeLanguage.flag} {activeLanguage.label} 편집 중
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
              {activeLanguage.flag} {activeLanguage.label} 편집 중
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
            {busy ? '만드는 중…' : '전체 ZIP 다운로드'}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 flex-col xl:grid xl:grid-cols-[192px_minmax(0,1fr)_288px] xl:overflow-hidden">
        {/* 파일 리스트 — 모바일에선 가로 스트립 */}
        <aside className="flex flex-col border-b border-gray-100 xl:border-b-0 xl:border-r">
          <p className="px-4 pb-2 pt-3 text-xs font-bold text-sub xl:pt-4">
            이모티콘 {items.length}장 · 완료 {doneIds.length}장
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
                  className={`group flex w-48 shrink-0 cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors xl:mb-1.5 xl:w-auto xl:shrink ${
                    active ? 'bg-brand-soft' : 'hover:bg-surface'
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
                      {done ? '✓ 완료' : active ? '편집 중' : '대기'}
                    </span>
                  </span>
                  {done && (
                    <Check className="h-4 w-4 shrink-0 text-brand-dark" strokeWidth={3} />
                  )}
                  {items.length > 1 && (
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        deleteItem(idx)
                      }}
                      title={`${item.name} 삭제`}
                      className="shrink-0 rounded-lg p-1.5 text-sub transition-colors hover:bg-white hover:text-[#EF4444] xl:opacity-0 xl:group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
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
              <ChevronLeft className="h-4 w-4 shrink-0" /> 이전
            </Button>
            <Button
              size="sm"
              onClick={goNext}
              disabled={currentIdx === items.length - 1}
              className="flex-1 gap-1 px-2! whitespace-nowrap"
            >
              다음 <ChevronRight className="h-4 w-4 shrink-0" />
            </Button>
          </div>
        </aside>

        {/* 원본 / 변환 미리보기 캔버스 */}
        <section className="relative flex flex-col items-center justify-center gap-4 overflow-hidden bg-surface pb-24 pt-5 lg:gap-5 lg:pb-8 lg:pt-5">
          <div className="flex w-full max-w-[800px] items-center justify-between gap-3 px-5">
            <span className="text-xs font-bold text-sub">
              {current.korean ? '텍스트를 찾았어요' : '직접 문구를 입력해보세요'}
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
                  원래 크기
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
                {tab === '원본' ? '원본' : '변환 미리보기'}
              </button>
            ))}
          </div>

          <div className="grid w-full max-w-[800px] grid-cols-1 gap-5 px-5 lg:grid-cols-2 lg:gap-6">
            {/* 좌측: 원본과 감지 위치 */}
            <article className={`${mobileCanvasTab === '원본' ? 'block' : 'hidden'} lg:block`}>
              <p className="mb-2 text-center text-sm font-extrabold text-ink">원본</p>
              <div className="mx-auto h-[320px] w-[320px] overflow-hidden rounded-3xl bg-white sm:h-[340px] sm:w-[340px]">
                <div className="relative flex h-full w-full items-center justify-center transition-transform duration-200" style={canvasZoomStyle}>
                  {current.url ? (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-2">
                      <img src={current.analysis?.originalUrl ?? current.url} alt={current.name} draggable={false} className="h-full w-full select-none object-contain" style={{ transform: `scale(${style.imageScale / 100})` }} />
                    </div>
                  ) : (
                    <span className="select-none text-[120px]" style={{ transform: `scale(${style.imageScale / 100})` }}>{current.emoji}</span>
                  )}
                  {detectedBox && (
                    <span
                      className="pointer-events-none absolute border-2 border-dashed border-brand bg-brand-soft/20"
                      style={{ left: `${detectedBox.x * 100}%`, top: `${detectedBox.y * 100}%`, width: `${detectedBox.width * 100}%`, height: `${detectedBox.height * 100}%` }}
                    />
                  )}
                </div>
              </div>
              <p className="mt-3 text-center text-xs font-semibold text-sub">
                {current.korean ? '텍스트를 찾았어요' : '텍스트를 찾지 못했어요'}
              </p>
            </article>

            {/* 우측: 변환 미리보기와 편집 제스처 */}
            <article className={`${mobileCanvasTab === '미리보기' ? 'block' : 'hidden'} lg:block`}>
              <p className="mb-2 text-center text-sm font-extrabold text-ink">변환 미리보기</p>
              <div className="checkerboard mx-auto h-[320px] w-[320px] overflow-hidden rounded-3xl sm:h-[340px] sm:w-[340px]">
                <div ref={cleanupPreviewRef} onPointerDown={() => setSelected(false)} className="relative flex h-full w-full items-center justify-center transition-transform duration-200" style={canvasZoomStyle}>
                  {current.url ? (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-2">
                      <img src={current.url} alt={`${current.name} 변환 미리보기`} draggable={false} className="h-full w-full select-none object-contain" style={{ transform: `scale(${style.imageScale / 100})` }} />
                    </div>
                  ) : (
                    <span className="select-none text-[120px]" style={{ transform: `scale(${style.imageScale / 100})` }}>{current.emoji}</span>
                  )}
                  {cleanupBox && manualCleanup && (
                    <span
                      onPointerDown={event => startManualCleanupGesture(event, 'move')}
                      className={`absolute cursor-move border-2 border-brand ${manualCleanup.mode === 'transparent' ? 'checkerboard' : ''}`}
                      style={{
                        left: `${cleanupBox.x * 100}%`,
                        top: `${cleanupBox.y * 100}%`,
                        width: `${cleanupBox.width * 100}%`,
                        height: `${cleanupBox.height * 100}%`,
                        backgroundColor: manualCleanup.mode === 'solid' ? manualCleanup.color ?? '#FFFFFF' : undefined,
                      }}
                    >
                      <span onPointerDown={event => startManualCleanupGesture(event, 'resize')} className="absolute -bottom-1 -right-1 h-3 w-3 cursor-nwse-resize rounded-sm border-2 border-brand bg-white" />
                    </span>
                  )}
                  <div className="absolute left-1/2 top-1/2" style={{ transform: `translate(-50%, -50%) translate(${style.x}px, ${style.y}px) rotate(${style.rotation}deg)` }}>
                    {preview || !selected ? (
                      <span onPointerDown={preview ? undefined : e => { e.stopPropagation(); setSelected(true) }} className={`whitespace-nowrap ${preview ? '' : 'cursor-pointer'}`} style={overlayTextStyle}>{suggestionText}</span>
                    ) : (
                      <div ref={boxRef} onPointerDown={e => startGesture(e, 'move')} className="touch-none relative cursor-move border-2 border-brand px-3 py-1">
                        <span className="select-none whitespace-nowrap" style={overlayTextStyle}>{suggestionText}</span>
                        {cornerHandles.map(pos => <span key={pos} onPointerDown={e => startGesture(e, 'resize')} className={`touch-none absolute h-2.5 w-2.5 rounded-[2px] border-2 border-brand bg-white ${pos}`} />)}
                        {edgeHandles.map(pos => <span key={pos} className={`pointer-events-none absolute h-2 w-2 rounded-[2px] border-2 border-brand bg-white ${pos}`} />)}
                        <span className="pointer-events-none absolute -top-6 left-1/2 h-4 w-px -translate-x-1/2 bg-brand" />
                        <span onPointerDown={e => startGesture(e, 'rotate')} className="touch-none absolute -top-10 left-1/2 flex h-4 w-4 -translate-x-1/2 cursor-grab items-center justify-center rounded-full border-2 border-brand bg-white active:cursor-grabbing" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <p className="mt-3 text-center text-xs font-semibold text-sub">
                {current.url
                  ? current.analysis?.needsManualCleanup
                    ? '복잡한 배경은 수동 보정이 필요할 수 있어요.'
                    : 'AI가 정리한 이미지 위에 번역을 합성해요.'
                  : '텍스트를 끌어서 옮기고, 모서리와 위 핸들로 다듬어보세요'}
              </p>
            </article>
          </div>

          {isLoading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-surface/90 px-6">
              <div className="flex w-full max-w-xs flex-col items-center rounded-3xl bg-white px-7 py-8 text-center shadow-[0_12px_32px_rgba(0,0,0,0.08)]">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft">
                  <LoaderCircle className="h-6 w-6 animate-spin text-brand-dark" />
                </span>
                <p className="mt-4 text-lg font-extrabold">{DEMO_LOADING_STEPS[loadingStep]}</p>
                <p className="mt-1 text-sm font-medium text-sub">잠시만 기다려주세요</p>
              </div>
            </div>
          )}

          {/* 이전 / 다음 (모바일 오버레이) */}
          <div className="absolute bottom-14 left-4 flex gap-2 lg:hidden">
            <button
              onClick={goPrev}
              disabled={currentIdx === 0}
              className="rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-ink disabled:text-gray-300"
            >
              ← 이전
            </button>
            <button
              onClick={goNext}
              disabled={currentIdx === items.length - 1}
              className="rounded-xl bg-brand px-3.5 py-2 text-xs font-bold text-white disabled:bg-gray-200 disabled:text-gray-400"
            >
              다음 →
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
          className={`relative z-10 -mt-6 flex flex-col gap-7 rounded-t-[28px] bg-white p-6 shadow-[0_-10px_30px_rgba(0,0,0,0.10)] lg:fixed lg:inset-y-0 lg:right-0 lg:z-40 lg:mt-0 lg:w-[288px] lg:overflow-y-auto lg:rounded-none lg:border-l lg:border-gray-100 lg:shadow-[0_0_24px_rgba(0,0,0,0.12)] lg:transition-transform xl:static xl:z-auto xl:w-auto xl:translate-x-0 xl:shadow-none ${
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
                  {tab}
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
            <div className={`mb-4 rounded-xl border p-3 ${needsManualOcrReview ? 'border-amber-200 bg-amber-50' : 'border-gray-100 bg-surface'}`}>
              <p className="text-xs font-extrabold">인식 문구 수정 {needsManualOcrReview && <span className="text-amber-700">· 확인 필요</span>}</p>
              <p className="mt-1 text-[11px] text-sub">문구 또는 감지 영역을 확인한 뒤 저장하면 이 이미지 하나만 다시 번역·정리합니다.</p>
              <input value={ocrDraft || current.korean} onChange={event => setOcrDraft(event.target.value)} className="mt-2 h-9 w-full rounded-lg border border-gray-200 bg-white px-2 text-sm font-semibold outline-none focus:border-brand" />
              <button onClick={() => { if (detectedBox) void reviseOcr(current.id, ocrDraft || current.korean, detectedBox).then(() => { setOcrDraft(''); refreshProject() }) }} disabled={!detectedBox || !(ocrDraft || current.korean).trim()} className="mt-2 rounded-lg bg-brand px-3 py-1.5 text-xs font-extrabold text-white disabled:opacity-40">인식 문구 저장 후 재처리</button>
            </div>
            <PanelTitle>AI 번역 추천</PanelTitle>
            <div className="mt-3 flex flex-col gap-2">
              {current.suggestions.map((sug, i) => {
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
              마음에 드는 게 없다면 직접 써보세요
            </p>
            <input
              value={style.customText}
              onFocus={beginGesture}
              onChange={e => live({ customText: e.target.value })}
              placeholder="원하는 문구를 직접 입력해보세요"
              className={`mt-2 h-11 w-full rounded-xl border-2 px-3 text-[15px] font-semibold outline-none transition-colors ${
                usingCustom
                  ? 'border-brand bg-brand-soft'
                  : 'border-gray-100 bg-white focus:border-brand'
              }`}
            />
          </section>

          {/* ── 폰트 탭 ── */}
          <section className={tabClass('폰트')}>
            <PanelTitle>폰트</PanelTitle>
            {/* AI 폰트 추천 — 원본 글씨체 기반 (API 연동 전 데모) */}
            {style.font !== current.recommendedFont && (
              <button
                onClick={() =>
                  update({
                    font: current.recommendedFont,
                    weight: clampWeight(current.recommendedFont, style.weight),
                  })
                }
                className="mt-3 flex w-full items-center gap-2 rounded-2xl border-2 border-dashed border-brand/40 bg-brand-soft/60 px-4 py-2.5 text-left transition-colors hover:border-brand"
              >
                <Sparkles className="h-4 w-4 shrink-0 text-brand-dark" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold text-sub">
                    원본 글씨체와 어울리는 AI 추천
                  </span>
                  <span
                    className="block truncate text-[15px] font-bold text-brand-dark"
                    style={{ fontFamily: `'${current.recommendedFont}', sans-serif` }}
                  >
                    {current.recommendedFont}
                  </span>
                </span>
                <span className="shrink-0 rounded-lg bg-brand px-2.5 py-1 text-xs font-bold text-white">
                  적용
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
                  {f === current.recommendedFont ? ' ✨ 추천' : ''}
                </option>
              ))}
            </select>
          </section>

          <section className={tabClass('폰트')}>
            <PanelTitle>굵기</PanelTitle>
            {(() => {
              const weights = fontWeights(style.font)
              if (weights.length <= 1) {
                return (
                  <p className="mt-3 rounded-xl bg-surface px-4 py-3 text-xs font-semibold text-sub">
                    이 폰트는 한 가지 굵기만 지원해요.
                  </p>
                )
              }
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
            <PanelTitle>크기 · 회전</PanelTitle>
            <div className="mt-3 flex flex-col gap-3">
              <RangeRow
                label="크기"
                min={10}
                max={96}
                value={style.size}
                suffix="px"
                onBegin={beginGesture}
                onLive={v => live({ size: v })}
              />
              <RangeRow
                label="회전"
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
            <PanelTitle>글자 색</PanelTitle>
            <div className="mt-3">
              <ColorRow
                value={style.color}
                presets={COLORS}
                onBegin={beginGesture}
                onLive={c => live({ color: c })}
                onPick={c => update({ color: c })}
              />
            </div>
          </section>

          <section className={tabClass('스타일')}>
            <div className="flex items-center justify-between">
              <PanelTitle>글자 배경</PanelTitle>
              <Toggle
                on={style.backgroundOn}
                onToggle={() => update({ backgroundOn: !style.backgroundOn })}
              />
            </div>
            {style.backgroundOn && (
              <div className="mt-3 flex flex-col gap-3">
                <ColorRow
                  value={style.backgroundColor}
                  presets={['#FFFFFF', '#191F28', '#22C55E', '#FDE047']}
                  onBegin={beginGesture}
                  onLive={c => live({ backgroundColor: c })}
                  onPick={c => update({ backgroundColor: c })}
                />
                <RangeRow
                  label="불투명도"
                  min={0}
                  max={100}
                  value={style.backgroundOpacity}
                  suffix="%"
                  onBegin={beginGesture}
                  onLive={v => live({ backgroundOpacity: v })}
                />
                <RangeRow
                  label="여백"
                  min={0}
                  max={24}
                  value={style.backgroundPadding}
                  suffix="px"
                  onBegin={beginGesture}
                  onLive={v => live({ backgroundPadding: v })}
                />
                <RangeRow
                  label="모서리"
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
              <PanelTitle>테두리</PanelTitle>
              <Toggle
                on={style.strokeOn}
                onToggle={() => update({ strokeOn: !style.strokeOn })}
              />
            </div>
            {style.strokeOn && (
              <div className="mt-3 flex flex-col gap-3">
                <RangeRow
                  label="굵기"
                  min={1}
                  max={6}
                  value={style.strokeWidth}
                  suffix="px"
                  onBegin={beginGesture}
                  onLive={v => live({ strokeWidth: v })}
                />
                <ColorRow
                  value={style.strokeColor}
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
              <PanelTitle>그림자</PanelTitle>
              <Toggle
                on={style.shadowOn}
                onToggle={() => update({ shadowOn: !style.shadowOn })}
              />
            </div>
            {style.shadowOn && (
              <div className="mt-3 flex flex-col gap-3">
                <ColorRow
                  value={style.shadowColor}
                  presets={['#000000', '#191F28', '#22C55E']}
                  onBegin={beginGesture}
                  onLive={c => live({ shadowColor: c })}
                  onPick={c => update({ shadowColor: c })}
                />
                <RangeRow
                  label="흐림"
                  min={0}
                  max={30}
                  value={style.shadowBlur}
                  suffix="px"
                  onBegin={beginGesture}
                  onLive={v => live({ shadowBlur: v })}
                />
                <RangeRow
                  label="가로"
                  min={-20}
                  max={20}
                  value={style.shadowX}
                  suffix="px"
                  onBegin={beginGesture}
                  onLive={v => live({ shadowX: v })}
                />
                <RangeRow
                  label="세로"
                  min={-20}
                  max={20}
                  value={style.shadowY}
                  suffix="px"
                  onBegin={beginGesture}
                  onLive={v => live({ shadowY: v })}
                />
                {/* 투명도: 0% = 진한 그림자, 100% = 안 보임 (내부 opacity는 반전 저장) */}
                <RangeRow
                  label="투명도"
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
            <PanelTitle>정렬</PanelTitle>
            {/* 가로 정렬 — 한 번 더 누르면 선택 해제 */}
            <div className="mt-3 flex items-center gap-2">
              <span className="w-8 shrink-0 text-xs font-semibold text-sub">가로</span>
              <div className="grid flex-1 grid-cols-3 gap-1.5">
                {(
                  [
                    ['left', '좌'],
                    ['center', '가운데'],
                    ['right', '우'],
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
              <span className="w-8 shrink-0 text-xs font-semibold text-sub">세로</span>
              <div className="grid flex-1 grid-cols-3 gap-1.5">
                {(
                  [
                    ['top', '상'],
                    ['middle', '가운데'],
                    ['bottom', '하'],
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
              <PanelTitle>원본 이미지 크기</PanelTitle>
              <div className="mt-3">
                <RangeRow
                  label="크기"
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
            <PanelTitle>배경</PanelTitle>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {(
                [
                  [true, '투명'],
                  [false, '화이트'],
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
              <PanelTitle>원문 지우기</PanelTitle>
              <Toggle
                on={Boolean(manualCleanup)}
                onToggle={() => manualCleanup ? update({ manualCleanup: undefined }) : updateManualCleanup({})}
              />
            </div>
            <p className="mt-2 text-xs font-semibold text-sub">
              {current.analysis?.needsManualCleanup ? '자동 정리가 어려운 배경이에요. 지울 영역을 직접 보정해주세요.' : '자동 정리 결과가 어색할 때만 직접 보정해주세요.'}
            </p>
            {manualCleanup && (
              <div className="mt-3 flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-2">
                  {(['transparent', 'solid'] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => updateManualCleanup({ mode })}
                      className={`h-10 rounded-xl border-2 text-sm font-bold ${manualCleanup.mode === mode ? 'border-brand bg-brand-soft text-brand-dark' : 'border-gray-100 text-sub'}`}
                    >
                      {mode === 'transparent' ? '투명 처리' : '배경색 채우기'}
                    </button>
                  ))}
                </div>
                {manualCleanup.mode === 'solid' && (
                  <label className="flex items-center justify-between text-xs font-bold text-sub">
                    배경색
                    <input type="color" value={manualCleanup.color ?? '#FFFFFF'} onChange={event => updateManualCleanup({ color: event.target.value })} />
                  </label>
                )}
                <RangeRow label="가로 위치" min={0} max={100} value={Math.round(manualCleanup.rect.x * 100)} suffix="%" onBegin={beginGesture} onLive={value => updateManualRect({ x: value / 100 })} />
                <RangeRow label="세로 위치" min={0} max={100} value={Math.round(manualCleanup.rect.y * 100)} suffix="%" onBegin={beginGesture} onLive={value => updateManualRect({ y: value / 100 })} />
                <RangeRow label="가로 크기" min={1} max={100} value={Math.round(manualCleanup.rect.width * 100)} suffix="%" onBegin={beginGesture} onLive={value => updateManualRect({ width: value / 100 })} />
                <RangeRow label="세로 크기" min={1} max={100} value={Math.round(manualCleanup.rect.height * 100)} suffix="%" onBegin={beginGesture} onLive={value => updateManualRect({ height: value / 100 })} />
              </div>
            )}
          </section>

          {/* ── 내보내기 (모바일에선 항상 표시) ── */}
          <section className="mt-auto border-t border-gray-100 bg-white pt-6 xl:sticky xl:bottom-0 xl:pb-1">
            <PanelTitle>내보내기</PanelTitle>
            <input
              value={exportName}
              onChange={e => setExportName(e.target.value)}
              className="mt-3 h-11 w-full rounded-xl border-2 border-gray-100 bg-white px-3 text-[14px] font-semibold outline-none focus:border-brand"
            />
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {(['PNG', 'GIF', 'ZIP'] as const).map(fmt => {
                const disabled = fmt === 'GIF' && !gifOk
                return (
                  <button
                    key={fmt}
                    onClick={() => setExportFormat(fmt)}
                    disabled={disabled}
                    title={disabled ? 'GIF 원본을 올렸을 때만 가능해요' : undefined}
                    className={`h-9 rounded-xl border-2 text-xs font-bold transition-colors ${
                      exportFormat === fmt
                        ? 'border-brand bg-brand-soft text-brand-dark'
                        : disabled
                          ? 'cursor-not-allowed border-gray-100 bg-surface text-gray-300'
                          : 'border-gray-100 bg-white text-sub hover:border-gray-200'
                    }`}
                  >
                    {fmt}
                  </button>
                )
              })}
            </div>
            {!gifOk && (
              <p className="mt-1.5 text-[11px] font-semibold text-sub">
                GIF는 움직이는 원본(GIF)을 올렸을 때만 받을 수 있어요.
              </p>
            )}
            <Button className="mt-3 w-full" glow onClick={handleExport} disabled={busy}>
              <Download className="h-4 w-4" /> {busy ? '만드는 중…' : '다운로드'}
            </Button>
          </section>
        </aside>
      </div>
    </div>
  )
}
