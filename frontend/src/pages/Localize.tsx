import { useAuth } from '../store/AuthContext'
import { Check, Cloud, ImagePlus, X } from 'lucide-react'
import { useRef, useState, type DragEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import AILocalizationBadge from '../components/AILocalizationBadge'
import Button from '../components/Button'
import OgqSamplePicker from '../components/OgqSamplePicker'
import UploadSpecBadge from '../components/UploadSpecBadge'
import { useToast } from '../components/Toast'
import type { OgqSticker } from '../lib/api'
import { LANGUAGES, useUploads } from '../store/uploads'
import { useSiteLang } from '../i18n/LanguageContext'
import usFlag from '../assets/GCFrontendUI/USA (us).svg'
import jpFlag from '../assets/GCFrontendUI/Japan (JP).svg'
import cnFlag from '../assets/GCFrontendUI/China (CN).svg'
import dragNDropImage from '../assets/GCFrontendUI/DragNDropIMG.svg'

// OS(특히 Windows)마다 국기 이모지 렌더가 달라서, 통일된 이미지 아이콘을 쓴다.
const FLAG_IMG: Record<string, string> = { en: usFlag, ja: jpFlag, zh: cnFlag }

function StepIndicator() {
  const { t } = useSiteLang()
  return (
    <div className="flex items-center gap-1 whitespace-nowrap text-[10px] font-semibold text-sub sm:gap-2 sm:text-xs md:text-sm">
      <span className="text-brand-dark">1 {t.stepUpload}</span>
      <span>›</span>
      <span>2 {t.stepEdit}</span>
      <span>›</span>
      <span>3 {t.stepDownload}</span>
    </div>
  )
}

export default function Localize() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
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
    cloudSaving,
    projectStatus,
    cloudError,
    saveDraft,
  } = useUploads()
  const [dragging, setDragging] = useState(false)
  const [starting, setStarting] = useState(false)
  const [showAllLangs, setShowAllLangs] = useState(false)
  const [showSamplePicker, setShowSamplePicker] = useState(false)
  const [selectingSampleId, setSelectingSampleId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const desktopStartContainerRef = useRef<HTMLDivElement>(null)
  const desktopStartButtonWidthRef = useRef<number | null>(null)
  const desktopStartFrameRef = useRef<number | null>(null)
  const desktopStartResetTimerRef = useRef<number | null>(null)
  const [desktopStartButtonWidth, setDesktopStartButtonWidth] = useState<string>()
  const toast = useToast()
  const { t } = useSiteLang()

  const handleFiles = (incoming: File[]) => {
    if (!isAuthenticated) { navigate('/login?next=/localize'); return }
    const images = incoming.filter(f => f.type === 'image/png' || f.type === 'image/jpeg')
    if (images.length < incoming.length) {
      toast(t.dashToastFormat)
    }
    // 새로 올린 이모티콘은 자동으로 선택됨
    addFiles(images)
  }

  // thumbnailUrl은 인증 없이 바로 fetch할 수 있어(OGQ API 문서 기준), 프론트에서 바로 받아
  // File로 감싼 뒤 handleFiles에 흘려보내면 업로드와 완전히 동일한 파이프라인을 탄다.
  // (asset.imageUrl은 OGQ 검색 API에서 리사이즈 format 파라미터 없이 내려와 CDN이 400을
  // 반환하는 걸 실측으로 확인해 쓰지 않는다 — thumbnailUrl만 신뢰한다.)
  const handleSelectSample = async (sticker: OgqSticker) => {
    setSelectingSampleId(sticker.assetId)
    try {
      const response = await fetch(sticker.thumbnailUrl)
      if (!response.ok) throw new Error('OGQ 샘플 이미지를 불러오지 못했습니다.')
      const blob = await response.blob()
      // OGQ CDN이 image/png 대신 application/octet-stream으로 응답해(실측 확인), blob.type을
      // 믿지 않고 OGQ 스티커는 항상 PNG라는 사실(API 문서 기준)을 그대로 명시한다.
      const file = new File([blob], `ogq-${sticker.assetId}.png`, { type: 'image/png' })
      handleFiles([file])
      setShowSamplePicker(false)
    } catch {
      toast(t.samplePickerError)
    } finally {
      setSelectingSampleId(null)
    }
  }

  const beginLocalization = async () => {
    if (desktopStartResetTimerRef.current !== null) {
      window.clearTimeout(desktopStartResetTimerRef.current)
      desktopStartResetTimerRef.current = null
    }
    const desktopWidth = desktopStartContainerRef.current?.querySelector('button')?.getBoundingClientRect().width
    desktopStartButtonWidthRef.current = desktopWidth || null
    if (desktopWidth) {
      setDesktopStartButtonWidth(`${desktopWidth}px`)
    }
    setStarting(true)
    if (desktopWidth) {
      desktopStartFrameRef.current = window.requestAnimationFrame(() => {
        desktopStartFrameRef.current = null
        setDesktopStartButtonWidth('100%')
      })
    }
    try {
      await startLocalization()
      navigate('/editor')
    } catch (error) {
      if (desktopStartFrameRef.current !== null) {
        window.cancelAnimationFrame(desktopStartFrameRef.current)
        desktopStartFrameRef.current = null
      }
      setStarting(false)
      if (desktopStartButtonWidthRef.current !== null) {
        setDesktopStartButtonWidth(`${desktopStartButtonWidthRef.current}px`)
        desktopStartResetTimerRef.current = window.setTimeout(() => {
          setDesktopStartButtonWidth(undefined)
          desktopStartResetTimerRef.current = null
        }, 500)
      }
      toast(error instanceof Error ? error.message : t.dashToastStartFail)
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
  // 백그라운드 자동저장(cloudSaving)이 끝나길 기다리지 않는다. startLocalization이 내부에서
  // saveDraft()를 직접 호출하고, 진행 중인 저장 뒤에 순서대로 이어 붙기 때문에 바로 눌러도 안전하다.
  // 대신 이미 시작을 눌러 진행 중일 때는 더블클릭을 막는다.
  const canStart = isAuthenticated && !starting && selectedCount > 0 && targetLangs.length > 0

  return (
    <div className="studio-localize min-h-screen bg-white">

      <div className="workspace-stepbar"><div className="layout-app"><StepIndicator /></div></div>
      <main className="layout-app pb-32 pt-10 sm:py-16 lg:pb-16">
        <p className="text-sm font-extrabold text-brand-dark">{t.dashStep1}</p>
        <h1 className="mt-2 text-[32px] font-extrabold tracking-tight sm:text-[34px]">{t.dashTitle}</h1>
        <p className="mt-2 text-[16px] font-medium text-sub">
          {t.dashSubtitle}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <AILocalizationBadge />
          <UploadSpecBadge />
        </div>

        {!isAuthenticated && <div className="mt-6 rounded-panel border border-gray-200 bg-white p-5"><p className="text-sm text-sub">{t.cloudLogin}</p><Button className="mt-3" onClick={() => navigate('/login?next=/localize')}>{t.navLogin}</Button></div>}
        {isAuthenticated && (hasFiles || cloudError) && <div role="status" className="mt-5 flex flex-wrap items-center gap-3 text-sm text-sub">{cloudError ? <span>{cloudError}</span> : <span className="inline-flex items-center gap-1.5"><Cloud size={16} aria-hidden="true" />{cloudSaving || !projectStatus ? t.cloudSaving : t.cloudSaved}</span>}{cloudError && <Button variant="outline" size="sm" onClick={() => { void saveDraft().catch(error => toast(error instanceof Error ? error.message : t.cloudSaveFailed)) }}>{t.cloudRetry}</Button>}</div>}
        {/* 드롭존 */}
        <div
          data-dragging={dragging}
          onDragOver={e => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => isAuthenticated ? inputRef.current?.click() : navigate('/login?next=/localize')}
          role="button"
          tabIndex={0}
          onKeyDown={e => { if (e.key === 'Enter') { if (isAuthenticated) inputRef.current?.click(); else navigate('/login?next=/localize') } }}
          className={`studio-upload relative isolate mt-5 flex cursor-pointer flex-col items-center gap-4 rounded-panel border-2 border-dashed px-4 py-12 transition-[border-color,background-color] duration-300 sm:px-8 sm:py-16 ${
            dragging
              ? 'border-brand bg-brand-soft'
              : 'border-gray-200 bg-[#FAFBFC] hover:border-brand/70 '
          }`}
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-panel bg-brand-soft">
            <img src={dragNDropImage} alt="" aria-hidden className="h-10 w-10" />
          </span>
          <div className="break-keep text-center">
            <p className="text-lg font-bold">{t.dashDropTitle}</p>
            <p className="mt-1 text-sm font-medium text-sub">
              <span className="whitespace-nowrap">PNG · JPG</span>
              <span className="mx-1 hidden sm:inline">·</span>
              <br className="sm:hidden" />
              <span className="whitespace-nowrap">{t.dashDropMulti}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={e => e.stopPropagation()} className="pointer-events-none">
              {t.dashSelectFile}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={e => {
                e.stopPropagation()
                if (isAuthenticated) setShowSamplePicker(true); else navigate('/login?next=/localize')
              }}
            >
              {t.sampleTryLabel}
            </Button>
          </div>
          <input
            ref={inputRef}
            type="file"
            disabled={!isAuthenticated}
            accept="image/png,image/jpeg"
            multiple
            className="hidden"
            onChange={e => {
              handleFiles(Array.from(e.target.files ?? []))
              e.target.value = ''
            }}
          />
        </div>

        {showSamplePicker && (
          <OgqSamplePicker
            onClose={() => setShowSamplePicker(false)}
            onSelect={sticker => { void handleSelectSample(sticker) }}
            selectingId={selectingSampleId}
          />
        )}

        {hasFiles && !starting && (
          <p className="mt-5 text-sm font-bold text-brand-dark">
            {t.dashSelectedCount.replace('{n}', String(selectedCount))}
          </p>
        )}

        {/* 업로드된 파일 */}
        {files.length > 0 && (
          <section className="mt-12">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {t.dashListTitlePre}<span className="text-brand-dark">{selectedCount}</span>{t.dashListTitlePost}
              </h2>
              <div className="flex items-center gap-3 text-sm font-semibold">
                <button
                  onClick={toggleSelectAll}
                  className="text-brand-dark hover:underline"
                >
                  {allSelected ? t.dashDeselectAll : t.dashSelectAll}
                </button>
                {selectedCount > 0 && (
                  <>
                    <span className="text-gray-200">|</span>
                    <button
                      onClick={deleteSelected}
                      className="text-[#EF4444] hover:underline"
                    >
                      {t.dashDeleteSelected} ({selectedCount})
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
                    className={`group relative aspect-square cursor-pointer overflow-hidden rounded-panel border-2 transition-colors ${
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
              <h2 className="text-lg font-bold">{t.dashLangTitle}</h2>
              <span className="hidden text-sm font-semibold text-sub sm:inline">
                {t.dashLangHint}
              </span>
            </div>
            <button
              onClick={toggleAllLangs}
              disabled={!hasFiles}
              className="shrink-0 text-sm font-semibold text-brand-dark hover:underline"
            >
              {allLangsSelected ? t.dashDeselectAll : t.dashSelectAll}
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
                  className={`flex items-center gap-3 rounded-control border-2 px-4 py-4 text-left transition-colors ${
                    selected
                      ? 'border-brand bg-brand-soft'
                      : 'border-gray-100 bg-white hover:border-gray-200'
                  }`}
                >
                  {FLAG_IMG[lang.code] ? (
                    <img src={FLAG_IMG[lang.code]} alt="" className="h-5 w-auto rounded-sm" />
                  ) : (
                    <span className="text-2xl">{lang.flag}</span>
                  )}
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
                className="flex items-center justify-center gap-2 rounded-control border-2 border-dashed border-gray-200 px-4 py-4 text-[15px] font-bold text-sub transition-colors hover:border-brand/50 hover:text-brand-dark"
              >
                {showAllLangs ? t.dashCollapse : t.dashMore.replace('{n}', String(LANGUAGES.length - 7))}
              </button>
            )}
          </div>
        </section>

        {/* CTA */}
        <div ref={desktopStartContainerRef} className="mt-14 hidden w-full justify-center lg:flex">
          <Button
            size="lg"
            glow={canStart}
            disabled={!canStart}
            onClick={beginLocalization}
            aria-busy={starting}
            style={desktopStartButtonWidth ? { width: desktopStartButtonWidth } : undefined}
            className={`localize-start-button relative overflow-hidden ${starting ? 'w-full disabled:bg-brand-soft disabled:text-brand-dark' : 'min-w-[280px]'}`}
          >
            {starting && <span role="progressbar" aria-label={t.dashUploading} className="pointer-events-none absolute inset-0 overflow-hidden rounded-panel bg-brand-soft"><span className="localize-progress-sweep absolute inset-y-0 left-0 w-2/5 rounded-panel" /></span>}
            <span className="relative">{starting ? t.dashUploading : selectedCount > 0 ? t.dashStart.replace('{n}', String(selectedCount)) : t.dashStartEmpty}</span>
          </Button>
        </div>
        {!canStart && (
          <p className="mt-4 hidden text-center text-sm font-medium text-sub lg:block">
            {!hasFiles
              ? t.dashHintNoFile
              : selectedCount === 0
                ? t.dashHintNoSelect
                : t.dashHintNoLang}
          </p>
        )}
        {canStart && (
          <p className="mt-4 hidden text-center text-sm font-medium text-sub lg:block">
            {t.dashHintReady}
          </p>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 rounded-t-[20px] border-t border-gray-100 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <Button
          size="md"
          glow={canStart}
          disabled={!canStart}
          onClick={beginLocalization}
          aria-busy={starting}
          className={`localize-start-button relative w-full overflow-hidden ${starting ? 'disabled:bg-brand-soft disabled:text-brand-dark' : ''}`}
        >
          {starting && <span role="progressbar" aria-label={t.dashUploading} className="pointer-events-none absolute inset-0 overflow-hidden rounded-panel bg-brand-soft"><span className="localize-progress-sweep absolute inset-y-0 left-0 w-2/5 rounded-panel" /></span>}
          <span className="relative">{starting ? t.dashUploading : selectedCount > 0 ? t.dashStart.replace('{n}', String(selectedCount)) : t.dashStartEmpty}</span>
        </Button>
        <p className="mt-1.5 text-center text-xs font-medium text-sub">
          {!hasFiles
            ? t.dashHintNoFile
            : selectedCount === 0
              ? t.dashHintNoSelect
              : targetLangs.length === 0
                ? t.dashHintNoLang
                : t.dashHintReady}
        </p>
      </div>
    </div>
  )
}
