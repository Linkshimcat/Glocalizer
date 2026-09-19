import { AlertTriangle, CheckCircle2, ImagePlus, Loader2, X, XCircle } from 'lucide-react'
import { useRef, useState, type DragEvent } from 'react'
import type { Dict } from '../i18n/translations'
import { useSiteLang } from '../i18n/LanguageContext'
import { checkOgqSpec, type OgqSpecCheckItem, type OgqSpecCheckResult } from '../lib/ogqSpecCheck'
import Button from './Button'
import { useToast } from './Toast'

function formatBytes(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)}KB` : `${(bytes / (1024 * 1024)).toFixed(2)}MB`
}

function categoryLabel(t: Dict, category: OgqSpecCheckResult['category']): string {
  if (category === 'main') return t.reviewCategoryMain
  if (category === 'sticker') return t.reviewCategorySticker
  if (category === 'tab') return t.reviewCategoryTab
  return ''
}

// 검사 항목 하나를 사람이 읽는 라벨·메시지·통과 여부로 바꾼다.
function describeItem(t: Dict, result: OgqSpecCheckResult, item: OgqSpecCheckItem): { label: string; message: string } {
  switch (item.key) {
    case 'format':
      return {
        label: t.reviewCheckFormatLabel,
        message: item.status === 'pass' ? t.reviewCheckFormatPass : t.reviewCheckFormatFail.replace('{type}', result.fileType || '?'),
      }
    case 'size': {
      const size = formatBytes(result.fileSizeBytes)
      return {
        label: t.reviewCheckSizeLabel,
        message: (item.status === 'pass' ? t.reviewCheckSizePass : t.reviewCheckSizeFail).replace('{size}', size),
      }
    }
    case 'dimensions':
      return {
        label: t.reviewCheckDimensionsLabel,
        message:
          item.status === 'pass'
            ? t.reviewCheckDimensionsPass
                .replace('{w}', String(result.width))
                .replace('{h}', String(result.height))
                .replace('{category}', categoryLabel(t, result.category))
            : t.reviewCheckDimensionsFail.replace('{w}', String(result.width)).replace('{h}', String(result.height)),
      }
    case 'transparency':
      return {
        label: t.reviewCheckTransparencyLabel,
        message: item.status === 'pass' ? t.reviewCheckTransparencyPass : t.reviewCheckTransparencyFail,
      }
    case 'margin':
      return {
        label: t.reviewCheckMarginLabel,
        message:
          result.marginRatio === null ? t.reviewCheckMarginUnknown : item.status === 'pass' ? t.reviewCheckMarginPass : t.reviewCheckMarginWarn,
      }
  }
}

function StatusIcon({ status }: { status: OgqSpecCheckItem['status'] }) {
  if (status === 'pass') return <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-dark" />
  if (status === 'fail') return <XCircle className="h-4 w-4 shrink-0 text-red-500" />
  return <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
}

const STATUS_BG: Record<OgqSpecCheckItem['status'], string> = {
  pass: 'bg-brand-soft/60',
  fail: 'bg-red-50',
  warn: 'bg-amber-50',
}

function ResultCard({ result }: { result: OgqSpecCheckResult }) {
  const { t } = useSiteLang()
  const issueCount = result.items.filter(item => item.status !== 'pass').length

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
        <p className="truncate text-sm font-bold">{result.fileName}</p>
        <span className={`shrink-0 text-xs font-bold ${issueCount === 0 ? 'text-brand-dark' : 'text-red-500'}`}>
          {issueCount === 0 ? t.reviewCheckAllPass : t.reviewCheckIssues.replace('{n}', String(issueCount))}
        </span>
      </div>
      <div className="flex flex-col gap-4 p-4 sm:flex-row">
        <img src={result.previewUrl} alt="" className="h-32 w-32 shrink-0 self-center rounded-xl border border-gray-100 bg-[repeating-conic-gradient(#f3f4f6_0%_25%,white_0%_50%)] bg-[length:16px_16px] object-contain sm:self-start" />
        <ul className="flex min-w-0 flex-1 flex-col gap-2">
          {result.items.map(item => {
            const { label, message } = describeItem(t, result, item)
            return (
              <li key={item.key} className={`flex items-start gap-2 rounded-xl px-3 py-2 text-sm ${STATUS_BG[item.status]}`}>
                <StatusIcon status={item.status} />
                <span>
                  <span className="font-bold">{label}</span> — {message}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

export default function OgqSpecChecker() {
  const { t } = useSiteLang()
  const toast = useToast()
  const [results, setResults] = useState<OgqSpecCheckResult[]>([])
  const [checking, setChecking] = useState(false)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (incoming: File[]) => {
    const images = incoming.filter(f => f.type === 'image/png' || f.type === 'image/jpeg')
    if (images.length < incoming.length) toast(t.dashToastFormat)
    if (images.length === 0) return
    setChecking(true)
    try {
      const checked = await Promise.all(images.map(file => checkOgqSpec(file)))
      setResults(prev => [...prev, ...checked])
    } finally {
      setChecking(false)
    }
  }

  const removeResult = (index: number) => {
    setResults(prev => {
      URL.revokeObjectURL(prev[index].previewUrl)
      return prev.filter((_, i) => i !== index)
    })
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    void handleFiles(Array.from(e.dataTransfer.files))
  }

  return (
    <section className="mt-10">
      <h2 className="text-lg font-bold">{t.reviewUploadTitle}</h2>
      <p className="mt-1 text-sm font-medium text-sub">{t.reviewUploadDesc}</p>

      <div
        data-dragging={dragging}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter') inputRef.current?.click() }}
        className={`mt-4 flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
          dragging ? 'border-brand bg-brand-soft' : 'border-gray-200 bg-[#FAFBFC] hover:border-brand/70'
        }`}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-soft">
          {checking ? <Loader2 className="h-6 w-6 animate-spin text-brand-dark" /> : <ImagePlus className="h-6 w-6 text-brand-dark" />}
        </span>
        <p className="text-sm font-bold">{t.reviewUploadDrop}</p>
        <p className="text-xs font-medium text-sub">{t.reviewUploadHint}</p>
        <Button size="sm" onClick={e => e.stopPropagation()} className="pointer-events-none">
          {t.reviewUploadSelectFile}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg"
          multiple
          className="hidden"
          onChange={e => {
            void handleFiles(Array.from(e.target.files ?? []))
            e.target.value = ''
          }}
        />
      </div>

      {results.length > 0 && (
        <div className="mt-5 flex flex-col gap-4">
          {results.map((result, index) => (
            <div key={`${result.fileName}-${index}`} className="relative">
              <button
                type="button"
                onClick={() => removeResult(index)}
                aria-label={t.reviewUploadRemove}
                title={t.reviewUploadRemove}
                className="absolute -right-2 -top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-sub shadow-sm hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
              <ResultCard result={result} />
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 text-xs text-sub">{t.reviewUploadDisclaimer}</p>
    </section>
  )
}
