import {
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  FileArchive,
  Redo2,
  RotateCcw,
  ScanText,
  Sparkles,
  Trash2,
  Undo2,
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
import { COLORS, FONTS, WEIGHTS, isGif, toDemoItems } from '../data/demo'
import {
  downloadBlob,
  exportFileName,
  renderItemToPng,
  zipItems,
} from '../lib/exportImage'
import { DEFAULT_STYLE, hexToRgba, resolveText, type Style } from '../lib/style'
import { useUploads } from '../store/uploads'

const ALIGN_X = { left: -95, center: 0, right: 95 } as const
const ALIGN_Y = { top: -105, middle: 0, bottom: 105 } as const
const ZOOMS = [50, 100, 200]

type MobileTab = '번역' | '폰트' | '스타일'

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
  return (
    <div className="flex items-center gap-3">
      <span className="w-14 shrink-0 text-xs font-semibold text-sub">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onPointerDown={onBegin}
        onChange={e => onLive(Number(e.target.value))}
        className="accent-brand min-w-0 flex-1"
      />
      <span className="w-11 shrink-0 text-right text-sm font-bold text-brand-dark">
        {value}
        {suffix}
      </span>
    </div>
  )
}

/* ── 에디터 본체 ──────────────────────────────────────────────────── */

export default function Editor() {
  const navigate = useNavigate()
  const { files, removeFile, targetLangs, styles: savedStyles, saveStyle } = useUploads()

  // 업로드된 파일이 있으면 그걸 쓰고, 없으면 데모 데이터로 시연
  const [removedDemoIds, setRemovedDemoIds] = useState<string[]>([])
  const items = useMemo(
    () => toDemoItems(files).filter(item => !removedDemoIds.includes(item.id)),
    [files, removedDemoIds],
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

  const [zoom, setZoom] = useState(100)
  const [preview, setPreview] = useState(false)
  const [mobileTab, setMobileTab] = useState<MobileTab>('번역')
  const [exportName, setExportName] = useState('glocalizer_export')
  const [exportFormat, setExportFormat] = useState<'PNG' | 'GIF' | 'ZIP'>('ZIP')

  const selectItem = (idx: number) => {
    saveStyle(current.id, style)
    setCurrentIdx(idx)
    setStyle(savedStyles[items[idx].id] ?? DEFAULT_STYLE)
    setPast([])
    setFuture([])
    if (!isGif(items[idx])) setExportFormat(f => (f === 'GIF' ? 'ZIP' : f))
  }
  const goNext = () => {
    setDoneIds(prev => (prev.includes(current.id) ? prev : [...prev, current.id]))
    if (currentIdx < items.length - 1) selectItem(currentIdx + 1)
  }
  const goPrev = () => {
    if (currentIdx > 0) selectItem(currentIdx - 1)
  }

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

    const onMove = (ev: PointerEvent) => {
      if (mode === 'move') {
        live({
          x: Math.max(-170, Math.min(170, Math.round(orig.x + (ev.clientX - startX) / scale))),
          y: Math.max(-170, Math.min(170, Math.round(orig.y + (ev.clientY - startY) / scale))),
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
  const gifOk = isGif(current)

  /* ── 다운로드 ─────────────────────────────────────────────────── */

  const [busy, setBusy] = useState(false)
  const langCode = targetLangs[0]?.code ?? 'en'

  const downloadCurrentPng = async () => {
    setBusy(true)
    try {
      saveStyle(current.id, style)
      downloadBlob(
        await renderItemToPng(current, style),
        exportFileName(current.name, langCode, 'png'),
      )
    } finally {
      setBusy(false)
    }
  }

  const downloadAllZip = async () => {
    setBusy(true)
    try {
      saveStyle(current.id, style)
      const stylesMap = { ...savedStyles, [current.id]: style }
      downloadBlob(
        await zipItems(items, stylesMap, langCode),
        `${exportName.trim() || 'glocalizer_export'}.zip`,
      )
      navigate('/result')
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
      saveStyle(current.id, style)
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
      navigate('/result')
    } finally {
      setBusy(false)
    }
  }

  const overlayTextStyle: React.CSSProperties = {
    fontSize: style.size,
    color: style.color,
    fontFamily: `'${style.font}', sans-serif`,
    fontWeight: WEIGHTS[style.weight].value,
    WebkitTextStroke: style.strokeOn
      ? `${style.strokeWidth}px ${style.strokeColor}`
      : undefined,
    textShadow: style.shadowOn
      ? `0 ${style.shadowY}px ${style.shadowBlur}px ${hexToRgba(style.shadowColor, style.shadowOpacity / 100)}`
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

  /** 모바일 탭별 표시 (데스크톱에선 전부 표시) */
  const tabClass = (tab: MobileTab) =>
    `${mobileTab === tab ? 'block' : 'hidden'} lg:block`

  return (
    <div className="flex min-h-screen flex-col bg-white lg:h-screen">
      {/* 상단 바 */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-3 py-2.5 lg:h-16 lg:flex-nowrap lg:gap-3 lg:px-6 lg:py-0">
        {/* 모바일: 뒤로가기 + 타이틀 */}
        <button
          onClick={() => navigate('/dashboard')}
          aria-label="대시보드로 돌아가기"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface lg:hidden"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1 lg:hidden">
          <p className="text-sm font-extrabold">AI 에디터</p>
          <p className="truncate text-[11px] font-semibold text-sub">
            {currentIdx + 1} / {items.length} · {current.name}
          </p>
        </div>

        {/* 데스크톱: 로고 + 파일명 + 언어 배지 */}
        <div className="hidden items-center gap-3 lg:flex">
          <Logo small />
          <span className="h-5 w-px bg-gray-200" />
          <span className="text-sm font-semibold text-sub">{current.name}</span>
          {targetLangs.length > 0 && (
            <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-bold text-brand-dark">
              {targetLangs.map(l => l.flag).join(' ')}{' '}
              {targetLangs.map(l => l.label).join(' · ')}로 번역 중
            </span>
          )}
        </div>
        <div className="hidden flex-1 lg:block" />

        {/* 실행취소 / 다시실행 / 초기화 */}
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
        <span className="hidden h-5 w-px bg-gray-200 lg:inline" />

        {/* 미리보기 토글 */}
        <button
          onClick={() => setPreview(p => !p)}
          title="미리보기"
          className={`flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-bold transition-colors ${
            preview ? 'bg-brand-soft text-brand-dark' : 'text-sub hover:bg-surface'
          }`}
        >
          {preview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          <span className="hidden lg:inline">미리보기</span>
        </button>
        <span className="hidden h-5 w-px bg-gray-200 lg:inline" />

        <Button
          variant="secondary"
          size="sm"
          title="PNG 저장"
          onClick={downloadCurrentPng}
          disabled={busy}
        >
          <Download className="h-4 w-4" />
          <span className="hidden lg:inline">PNG 저장</span>
        </Button>
        <Button size="sm" onClick={downloadAllZip} disabled={busy}>
          <FileArchive className="h-4 w-4" />
          <span className="hidden lg:inline">
            {busy ? '만드는 중…' : '전체 ZIP 다운로드'}
          </span>
          <span className="lg:hidden">저장</span>
        </Button>
      </div>

      <div className="flex flex-1 flex-col lg:grid lg:grid-cols-[240px_1fr_320px] lg:overflow-hidden">
        {/* 파일 리스트 — 모바일에선 가로 스트립 */}
        <aside className="flex flex-col border-b border-gray-100 lg:border-b-0 lg:border-r">
          <p className="px-4 pb-2 pt-3 text-xs font-bold text-sub lg:pt-4">
            이모티콘 {items.length}장 · 완료 {doneIds.length}장
          </p>
          <div className="flex gap-1.5 overflow-x-auto px-2 pb-2 lg:flex-1 lg:flex-col lg:overflow-x-visible lg:overflow-y-auto lg:pb-0">
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
                  className={`group flex w-48 shrink-0 cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors lg:mb-1.5 lg:w-auto lg:shrink ${
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
                      className="shrink-0 rounded-lg p-1.5 text-sub transition-colors hover:bg-white hover:text-[#EF4444] lg:opacity-0 lg:group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
          {/* 이전 / 다음 (데스크톱) */}
          <div className="hidden gap-2 border-t border-gray-100 p-3 lg:flex">
            <Button
              variant="secondary"
              size="sm"
              onClick={goPrev}
              disabled={currentIdx === 0}
              className="flex-1"
            >
              <ChevronLeft className="h-4 w-4" /> 이전
            </Button>
            <Button size="sm" onClick={goNext} className="flex-1">
              {currentIdx === items.length - 1 ? '완료' : '다음'}{' '}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </aside>

        {/* 캔버스 */}
        <section className="relative flex flex-col items-center justify-center gap-5 overflow-hidden bg-surface pb-16 pt-8 lg:py-0">
          {current.korean ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-sm font-bold text-brand-dark shadow-sm">
              <ScanText className="h-4 w-4" />
              &lsquo;{current.korean}&rsquo; 텍스트를 찾았어요
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-sm font-bold text-sub shadow-sm">
              <ScanText className="h-4 w-4" />
              텍스트를 감지하지 못했어요 — 직접 입력해보세요
            </span>
          )}

          <div
            className="flex h-[360px] w-[360px] items-center justify-center"
            style={{ transform: `scale(${zoom / 100})` }}
          >
            <div
              className={`relative flex h-[320px] w-[320px] items-center justify-center rounded-3xl shadow-[0_16px_48px_rgba(0,0,0,0.12)] sm:h-[340px] sm:w-[340px] ${
                style.transparent ? 'checkerboard' : 'bg-white'
              }`}
            >
              {/* 원본 이미지 (또는 데모 이모지) */}
              {current.url ? (
                <img
                  src={current.url}
                  alt={current.name}
                  draggable={false}
                  className="max-h-[70%] max-w-[70%] select-none object-contain"
                />
              ) : (
                <span className="select-none text-[120px]">{current.emoji}</span>
              )}

              {/* 지워진 원본 텍스트 자리 표시 */}
              {!preview && current.korean && (
                <span className="absolute top-6 left-1/2 -translate-x-1/2 rounded-md border border-dashed border-sub/50 px-3 py-0.5 text-sm font-semibold text-sub/60 line-through">
                  {current.korean}
                </span>
              )}

              {/* 번역 텍스트 오버레이 — 드래그 이동 / 핸들 크기 / 회전 */}
              <div
                className="absolute left-1/2 top-1/2"
                style={{
                  transform: `translate(-50%, -50%) translate(${style.x}px, ${style.y}px) rotate(${style.rotation}deg)`,
                }}
              >
                {preview ? (
                  <span className="whitespace-nowrap" style={overlayTextStyle}>
                    {suggestionText}
                  </span>
                ) : (
                  <div
                    ref={boxRef}
                    onPointerDown={e => startGesture(e, 'move')}
                    className="touch-none relative cursor-move border-2 border-brand px-3 py-1"
                  >
                    <span
                      className="select-none whitespace-nowrap"
                      style={overlayTextStyle}
                    >
                      {suggestionText}
                    </span>

                    {/* 모서리 핸들 — 크기 조절 */}
                    {cornerHandles.map(pos => (
                      <span
                        key={pos}
                        onPointerDown={e => startGesture(e, 'resize')}
                        className={`touch-none absolute h-2.5 w-2.5 rounded-[2px] border-2 border-brand bg-white ${pos}`}
                      />
                    ))}
                    {/* 변 핸들 — 표시용 */}
                    {edgeHandles.map(pos => (
                      <span
                        key={pos}
                        className={`pointer-events-none absolute h-2 w-2 rounded-[2px] border-2 border-brand bg-white ${pos}`}
                      />
                    ))}
                    {/* 회전 핸들 */}
                    <span className="pointer-events-none absolute -top-6 left-1/2 h-4 w-px -translate-x-1/2 bg-brand" />
                    <span
                      onPointerDown={e => startGesture(e, 'rotate')}
                      className="touch-none absolute -top-10 left-1/2 flex h-4 w-4 -translate-x-1/2 cursor-grab items-center justify-center rounded-full border-2 border-brand bg-white active:cursor-grabbing"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <p className="hidden px-6 text-center text-xs font-semibold text-sub lg:block">
            텍스트를 끌어서 옮기고, 모서리로 크기를, 위 핸들로 회전을 조절해보세요
          </p>

          {/* 이전 / 다음 (모바일 오버레이) */}
          <div className="absolute bottom-5 left-4 flex gap-2 lg:hidden">
            <button
              onClick={goPrev}
              disabled={currentIdx === 0}
              className="rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-ink disabled:text-gray-300"
            >
              ← 이전
            </button>
            <button
              onClick={goNext}
              className="rounded-xl bg-brand px-3.5 py-2 text-xs font-bold text-white"
            >
              {currentIdx === items.length - 1 ? '완료' : '다음 →'}
            </button>
          </div>

          {/* 줌 컨트롤 */}
          <div className="absolute bottom-5 right-4 flex gap-1 rounded-xl bg-white p-1 shadow-sm lg:bottom-4">
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
          </div>

          {/* 진행 표시 (데스크톱) */}
          <span className="absolute bottom-4 left-4 hidden text-xs font-bold text-sub lg:block">
            {currentIdx + 1} / {items.length}
          </span>
        </section>

        {/* 컨트롤 패널 — 모바일에선 바텀시트 스타일 */}
        <aside className="relative z-10 -mt-6 flex flex-col gap-7 rounded-t-[28px] bg-white p-6 shadow-[0_-10px_30px_rgba(0,0,0,0.10)] lg:mt-0 lg:rounded-none lg:border-l lg:border-gray-100 lg:shadow-none lg:overflow-y-auto">
          {/* 시트 핸들 + 탭 (모바일 전용) */}
          <div className="-mb-2 lg:hidden">
            <div className="mx-auto h-1.5 w-10 rounded-full bg-gray-200" />
            <div className="mt-4 grid grid-cols-3 gap-2">
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
          </div>

          {/* ── 번역 탭 ── */}
          <section className={tabClass('번역')}>
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
                onClick={() => update({ font: current.recommendedFont })}
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
              onChange={e => update({ font: e.target.value })}
              className="mt-3 h-11 w-full rounded-xl border-2 border-gray-100 bg-white px-3 text-[15px] font-semibold outline-none focus:border-brand"
            >
              {FONTS.map(f => (
                <option key={f} value={f} style={{ fontFamily: `'${f}', sans-serif` }}>
                  {f}
                  {f === current.recommendedFont ? ' ✨ 추천' : ''}
                </option>
              ))}
            </select>
          </section>

          <section className={tabClass('폰트')}>
            <PanelTitle>굵기</PanelTitle>
            <div className="mt-3 grid grid-cols-4 gap-1.5">
              {WEIGHTS.map((w, i) => (
                <button
                  key={w.label}
                  onClick={() => update({ weight: i })}
                  className={`h-9 rounded-xl border-2 text-xs font-bold transition-colors ${
                    style.weight === i
                      ? 'border-brand bg-brand-soft text-brand-dark'
                      : 'border-gray-100 bg-white text-sub hover:border-gray-200'
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
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
                  label="거리"
                  min={0}
                  max={20}
                  value={style.shadowY}
                  suffix="px"
                  onBegin={beginGesture}
                  onLive={v => live({ shadowY: v })}
                />
                <RangeRow
                  label="불투명도"
                  min={0}
                  max={100}
                  value={style.shadowOpacity}
                  suffix="%"
                  onBegin={beginGesture}
                  onLive={v => live({ shadowOpacity: v })}
                />
              </div>
            )}
          </section>

          <section className={tabClass('스타일')}>
            <PanelTitle>정렬</PanelTitle>
            <div className="mt-3 grid grid-cols-6 gap-1.5">
              {(
                [
                  ['left', '좌'],
                  ['center', '중'],
                  ['right', '우'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => update({ x: ALIGN_X[key] })}
                  title={`가로 ${label}`}
                  className={`h-9 rounded-xl border-2 text-xs font-bold transition-colors ${
                    style.x === ALIGN_X[key]
                      ? 'border-brand bg-brand-soft text-brand-dark'
                      : 'border-gray-100 bg-white text-sub hover:border-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
              {(
                [
                  ['top', '상'],
                  ['middle', '중'],
                  ['bottom', '하'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => update({ y: ALIGN_Y[key] })}
                  title={`세로 ${label}`}
                  className={`h-9 rounded-xl border-2 text-xs font-bold transition-colors ${
                    style.y === ALIGN_Y[key]
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

          {/* ── 내보내기 (모바일에선 항상 표시) ── */}
          <section className="border-t border-gray-100 pt-6">
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
