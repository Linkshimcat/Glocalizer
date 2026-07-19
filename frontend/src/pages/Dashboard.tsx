import { Check, ImagePlus, Upload, X } from 'lucide-react'
import { useRef, useState, type DragEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Header from '../components/Header'
import { useToast } from '../components/Toast'
import { LANGUAGES, useUploads } from '../store/uploads'

function StepIndicator() {
  return (
    <div className="hidden items-center gap-2 text-sm font-semibold text-sub md:flex">
      <span className="text-brand-dark">1 업로드</span>
      <span>›</span>
      <span>2 편집</span>
      <span>›</span>
      <span>3 다운로드</span>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const {
    files,
    addFiles,
    removeFile,
    removeFiles,
    targetLangs,
    toggleTargetLang,
    setTargetLangs,
  } = useUploads()
  const [dragging, setDragging] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showAllLangs, setShowAllLangs] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const toast = useToast()

  /** 데모용 업로드 진행률 애니메이션 (실제 업로드 API 연동 시 교체) */
  const runProgress = (count: number) => {
    if (count === 0) return
    setProgress(0)
    let value = 0
    const timer = setInterval(() => {
      value += 12 + Math.random() * 18
      if (value >= 100) {
        clearInterval(timer)
        setProgress(100)
        setTimeout(() => setProgress(null), 600)
      } else {
        setProgress(Math.round(value))
      }
    }, 90)
  }

  const handleFiles = (incoming: File[]) => {
    const images = incoming.filter(f => f.type.startsWith('image/'))
    if (images.length < incoming.length) {
      toast('이미지 파일(PNG · JPG · GIF)만 올릴 수 있어요!')
    }
    // 새로 올린 이모티콘은 자동으로 선택됨
    const newIds = addFiles(images)
    setSelectedIds(prev => [...prev, ...newIds])
    runProgress(images.length)
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    handleFiles(Array.from(e.dataTransfer.files))
  }

  const toggleSelect = (id: string) =>
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    )

  const allSelected = files.length > 0 && selectedIds.length === files.length
  const toggleSelectAll = () =>
    setSelectedIds(allSelected ? [] : files.map(f => f.id))

  const deleteSelected = () => {
    removeFiles(selectedIds)
    setSelectedIds([])
  }

  const allLangsSelected = targetLangs.length === LANGUAGES.length
  const toggleAllLangs = () => {
    if (allLangsSelected) {
      setTargetLangs([])
    } else {
      setTargetLangs(LANGUAGES)
      setShowAllLangs(true) // 전체 선택 시 목록도 펼쳐 보여줌
    }
  }

  const canStart = files.length > 0 && targetLangs.length > 0

  return (
    <div className="min-h-screen bg-white">
      <Header right={<StepIndicator />} />

      <main className="mx-auto max-w-[880px] px-6 py-16">
        <h1 className="text-[34px] font-extrabold tracking-tight">
          이모티콘을 올려주세요
        </h1>
        <p className="mt-2 text-[16px] font-medium text-sub">
          PNG, JPG, GIF 파일을 끌어다 놓으면 바로 시작할 수 있어요.
        </p>

        {/* 드롭존 */}
        <div
          onDragOver={e => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
          className={`mt-10 flex cursor-pointer flex-col items-center gap-4 rounded-[28px] border-2 border-dashed px-4 py-12 transition-colors sm:px-8 sm:py-16 ${
            dragging
              ? 'border-brand bg-brand-soft'
              : 'border-gray-200 bg-[#FAFBFC] hover:border-brand/50'
          }`}
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft">
            <Upload className="h-7 w-7 text-brand-dark" strokeWidth={2.5} />
          </span>
          <div className="break-keep text-center">
            <p className="text-lg font-bold">파일을 여기에 끌어다 놓으세요</p>
            <p className="mt-1 text-sm font-medium text-sub">
              <span className="whitespace-nowrap">PNG · JPG · GIF</span>
              <span className="mx-1 hidden sm:inline">·</span>
              <br className="sm:hidden" />
              <span className="whitespace-nowrap">여러 장을 한 번에 올릴 수 있어요</span>
            </p>
          </div>
          <Button size="sm" onClick={e => e.stopPropagation()} className="pointer-events-none">
            파일 선택
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/gif"
            multiple
            className="hidden"
            onChange={e => {
              handleFiles(Array.from(e.target.files ?? []))
              e.target.value = ''
            }}
          />
        </div>

        {/* 업로드 진행률 */}
        {progress !== null && (
          <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">
                {progress < 100 ? '올리는 중이에요…' : '업로드 완료!'}
              </span>
              <span className="text-sm font-bold text-brand-dark">{progress}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface">
              <div
                className="h-full rounded-full bg-brand transition-[width] duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* 업로드된 파일 */}
        {files.length > 0 && (
          <section className="mt-12">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">
                올린 이모티콘 <span className="text-brand-dark">{files.length}</span>장
              </h2>
              <div className="flex items-center gap-3 text-sm font-semibold">
                <button
                  onClick={toggleSelectAll}
                  className="text-brand-dark hover:underline"
                >
                  {allSelected ? '선택 해제' : '전체 선택'}
                </button>
                {selectedIds.length > 0 && (
                  <>
                    <span className="text-gray-200">|</span>
                    <button
                      onClick={deleteSelected}
                      className="text-[#EF4444] hover:underline"
                    >
                      선택 삭제 ({selectedIds.length})
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {files.map(file => {
                const selected = selectedIds.includes(file.id)
                return (
                  <div
                    key={file.id}
                    onClick={() => toggleSelect(file.id)}
                    className={`group relative aspect-square cursor-pointer overflow-hidden rounded-2xl border-2 transition-colors ${
                      selected ? 'border-brand bg-brand-soft' : 'border-transparent bg-surface'
                    }`}
                  >
                    {file.url ? (
                      <img
                        src={file.url}
                        alt={file.name}
                        className="h-full w-full object-contain p-2"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center">
                        <ImagePlus className="h-8 w-8 text-sub" />
                      </span>
                    )}
                    {selected && (
                      <span className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white">
                        <Check className="h-3 w-3" strokeWidth={3.5} />
                      </span>
                    )}
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        removeFile(file.id)
                        setSelectedIds(prev => prev.filter(x => x !== file.id))
                      }}
                      aria-label={`${file.name} 삭제`}
                      className="absolute right-1.5 top-1.5 hidden h-6 w-6 items-center justify-center rounded-full bg-ink/70 text-white group-hover:flex"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <p className="absolute inset-x-0 bottom-0 truncate bg-white/80 px-2 py-1 text-[11px] font-semibold text-[#4E5968]">
                      {file.name}
                    </p>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* 언어 선택 (다중) */}
        <section className="mt-12">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-baseline gap-2">
              <h2 className="text-lg font-bold">번역할 언어를 골라주세요</h2>
              <span className="hidden text-sm font-semibold text-sub sm:inline">
                여러 개도 좋아요
              </span>
            </div>
            <button
              onClick={toggleAllLangs}
              className="shrink-0 text-sm font-semibold text-brand-dark hover:underline"
            >
              {allLangsSelected ? '전체 해제' : '전체 선택'}
            </button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {(showAllLangs ? LANGUAGES : LANGUAGES.slice(0, 7)).map(lang => {
              const selected = targetLangs.some(l => l.code === lang.code)
              return (
                <button
                  key={lang.code}
                  onClick={() => toggleTargetLang(lang)}
                  className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-4 text-left transition-colors ${
                    selected
                      ? 'border-brand bg-brand-soft'
                      : 'border-gray-100 bg-white hover:border-gray-200'
                  }`}
                >
                  <span className="text-2xl">{lang.flag}</span>
                  <span className="flex-1 text-[15px] font-bold">{lang.label}</span>
                  {selected && (
                    <Check className="h-5 w-5 text-brand-dark" strokeWidth={3} />
                  )}
                </button>
              )
            })}
            <button
              onClick={() => setShowAllLangs(v => !v)}
              className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 px-4 py-4 text-[15px] font-bold text-sub transition-colors hover:border-brand/50 hover:text-brand-dark"
            >
              {showAllLangs ? '접기' : `+ ${LANGUAGES.length - 7}개 더보기`}
            </button>
          </div>
        </section>

        {/* CTA */}
        <div className="mt-14 flex justify-center">
          <Button
            size="lg"
            glow={canStart}
            disabled={!canStart}
            onClick={() => navigate('/editor')}
            className="min-w-[280px]"
          >
            {files.length > 0 ? `${files.length}장 번역하기 →` : '번역하기 →'}
          </Button>
        </div>
        {!canStart && (
          <p className="mt-4 text-center text-sm font-medium text-sub">
            이모티콘을 올리고 언어를 고르면 시작할 수 있어요.
          </p>
        )}
      </main>
    </div>
  )
}
