import { Check, ImagePlus, Upload, X } from 'lucide-react'
import { useRef, useState, type DragEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Header from '../components/Header'
import { useToast } from '../components/Toast'
import { LANGUAGES, useUploads } from '../store/uploads'

function StepIndicator() {
  return (
    <div className="flex items-center gap-2 text-xs font-semibold text-sub md:text-sm">
      <span className="text-brand-dark">1 업로드</span>
      <span className="hidden sm:inline">›</span>
      <span className="hidden sm:inline">2 편집</span>
      <span className="hidden sm:inline">›</span>
      <span className="hidden sm:inline">3 다운로드</span>
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
    selectedFileIds,
    toggleFileSelection,
    setSelectedFileIds,
    targetLangs,
    toggleTargetLang,
    setTargetLangs,
    startLocalization,
  } = useUploads()
  const [dragging, setDragging] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [showAllLangs, setShowAllLangs] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const toast = useToast()

  const handleFiles = (incoming: File[]) => {
    const images = incoming.filter(f => f.type === 'image/png' || f.type === 'image/jpeg')
    if (images.length < incoming.length) {
      toast('현재 처리 가능한 형식은 PNG · JPG예요. GIF는 다음 단계에서 지원해요.')
    }
    // 새로 올린 이모티콘은 자동으로 선택됨
    addFiles(images)
  }

  const beginLocalization = async () => {
    setProgress(0)
    try {
      await startLocalization()
      setProgress(100)
      navigate('/editor')
    } catch (error) {
      setProgress(null)
      toast(error instanceof Error ? error.message : '업로드를 시작하지 못했어요.')
    }
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    handleFiles(Array.from(e.dataTransfer.files))
  }

  const allSelected = files.length > 0 && files.every(file => selectedFileIds.includes(file.id))
  const toggleSelectAll = () =>
    setSelectedFileIds(allSelected ? [] : files.map(file => file.id))

  const deleteSelected = () => {
    removeFiles(selectedFileIds)
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

  const selectedCount = files.filter(file => selectedFileIds.includes(file.id)).length
  const hasFiles = files.length > 0
  const canStart = selectedCount > 0 && targetLangs.length > 0

  return (
    <div className="min-h-screen bg-white">
      <Header right={<StepIndicator />} />

      <main className="mx-auto max-w-[880px] px-4 pb-32 pt-10 sm:px-6 sm:py-16 lg:pb-16">
        <p className="text-sm font-extrabold text-brand-dark">1단계 · 업로드</p>
        <h1 className="mt-2 text-[32px] font-extrabold tracking-tight sm:text-[34px]">이모티콘을 올려주세요</h1>
        <p className="mt-2 text-[16px] font-medium text-sub">
          PNG, JPG 파일을 끌어다 놓으면 바로 시작할 수 있어요.
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
              <span className="whitespace-nowrap">PNG · JPG</span>
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
            accept="image/png,image/jpeg"
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

        {hasFiles && progress === null && (
          <p className="mt-5 text-sm font-bold text-brand-dark">
            {selectedCount}장을 번역 대상으로 골랐어요.
          </p>
        )}

        {/* 업로드된 파일 */}
        {files.length > 0 && (
          <section className="mt-12">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">
                번역할 이모티콘 <span className="text-brand-dark">{selectedCount}</span>장
              </h2>
              <div className="flex items-center gap-3 text-sm font-semibold">
                <button
                  onClick={toggleSelectAll}
                  className="text-brand-dark hover:underline"
                >
                  {allSelected ? '선택 해제' : '전체 선택'}
                </button>
                {selectedCount > 0 && (
                  <>
                    <span className="text-gray-200">|</span>
                    <button
                      onClick={deleteSelected}
                      className="text-[#EF4444] hover:underline"
                    >
                      선택 삭제 ({selectedCount})
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {files.map(file => {
                const selected = selectedFileIds.includes(file.id)
                return (
                  <div
                    key={file.id}
                    onClick={() => toggleFileSelection(file.id)}
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
        <section className={`mt-12 transition-opacity ${hasFiles ? 'opacity-100' : 'pointer-events-none opacity-40'}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-baseline gap-2">
              <h2 className="text-lg font-bold">번역할 언어를 골라주세요</h2>
              <span className="hidden text-sm font-semibold text-sub sm:inline">
                여러 개도 좋아요
              </span>
            </div>
            <button
              onClick={toggleAllLangs}
              disabled={!hasFiles}
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
                  disabled={!hasFiles}
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
            {/* 언어가 7개를 넘을 때만 더보기/접기 노출 */}
            {LANGUAGES.length > 7 && (
              <button
                onClick={() => setShowAllLangs(v => !v)}
                className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 px-4 py-4 text-[15px] font-bold text-sub transition-colors hover:border-brand/50 hover:text-brand-dark"
              >
                {showAllLangs ? '접기' : `+ ${LANGUAGES.length - 7}개 더보기`}
              </button>
            )}
          </div>
        </section>

        {/* CTA */}
        <div className="mt-14 hidden justify-center lg:flex">
          <Button
            size="lg"
            glow={canStart}
            disabled={!canStart}
            onClick={beginLocalization}
            className="min-w-[280px]"
          >
            {selectedCount > 0 ? `${selectedCount}장 번역 시작하기 →` : '번역 시작하기 →'}
          </Button>
        </div>
        {!canStart && (
          <p className="mt-4 hidden text-center text-sm font-medium text-sub lg:block">
            {!hasFiles
              ? '이모티콘을 먼저 올려주세요.'
              : selectedCount === 0
                ? '번역할 이모티콘을 골라주세요.'
                : '번역할 언어를 골라주세요.'}
          </p>
        )}
        {canStart && (
          <p className="mt-4 hidden text-center text-sm font-medium text-sub lg:block">
            편집 화면에서 번역 문구와 폰트를 다듬을 수 있어요.
          </p>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-100 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <Button
          size="md"
          glow={canStart}
          disabled={!canStart}
          onClick={beginLocalization}
          className="w-full"
        >
          {selectedCount > 0 ? `${selectedCount}장 번역 시작하기 →` : '번역 시작하기 →'}
        </Button>
        <p className="mt-1.5 text-center text-xs font-medium text-sub">
          {!hasFiles
            ? '이모티콘을 먼저 올려주세요.'
            : selectedCount === 0
              ? '번역할 이모티콘을 골라주세요.'
              : targetLangs.length === 0
                ? '번역할 언어를 골라주세요.'
                : '편집 화면에서 문구와 폰트를 다듬을 수 있어요.'}
        </p>
      </div>
    </div>
  )
}
