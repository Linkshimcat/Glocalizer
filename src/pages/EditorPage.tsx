import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowRight, Download, Upload } from "lucide-react"
import { Button } from "@/components/common/Button"
import { Emoticon } from "@/components/common/Emoticon"
import { useProjectState } from "@/hooks/useProjectState"
import { cn } from "@/lib/utils"
import { DEFAULT_TEXT_STYLE } from "@/types/project"

const LANGUAGE_FILE_SUFFIX: Record<string, string> = {
  en: "en",
  ja: "ja",
  zh: "zh",
  ko: "ko",
  es: "es",
  fr: "fr",
  de: "de",
}

function getLocalizedFileName(fileName: string, language: string) {
  const lastDotIndex = fileName.lastIndexOf(".")
  const baseName = lastDotIndex >= 0 ? fileName.slice(0, lastDotIndex) : fileName
  const extension = lastDotIndex >= 0 ? fileName.slice(lastDotIndex) : ".png"
  return `${baseName}_${LANGUAGE_FILE_SUFFIX[language] ?? language}${extension}`
}

export function EditorPage() {
  const navigate = useNavigate()
  const { project, loadSample, updateImage } = useProjectState()
  const [activeImageId, setActiveImageId] = useState(project?.images[0]?.id)

  useEffect(() => {
    if (!project) loadSample()
  }, [loadSample, project])

  useEffect(() => {
    if (!activeImageId && project?.images[0]) {
      setActiveImageId(project.images[0].id)
    }
  }, [activeImageId, project])

  if (!project || project.images.length === 0) {
    return <div className="min-h-dvh bg-background" />
  }

  const activeImage =
    project.images.find((image) => image.id === activeImageId) ?? project.images[0]
  const activeText = activeImage.editedText ?? activeImage.selectedTranslation
  const textStyle = { ...DEFAULT_TEXT_STYLE, ...activeImage.textStyle }
  const localizedFileName = getLocalizedFileName(
    activeImage.originalFileName,
    project.targetLanguage,
  )

  const updateTextStyle = (patch: Partial<typeof DEFAULT_TEXT_STYLE>) => {
    updateImage(activeImage.id, {
      textStyle: { ...activeImage.textStyle, ...patch },
    })
  }

  const renderArtwork = () =>
    activeImage.previewUrl ? (
      <img
        src={activeImage.previewUrl}
        alt={activeImage.originalFileName}
        className="size-full object-contain"
      />
    ) : (
      <Emoticon phrase={activeImage.sourceText} />
    )

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-14 w-full max-w-[1480px] items-center justify-between px-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-2 text-[15px] font-bold">
            <span className="truncate text-text-primary">{activeImage.originalFileName}</span>
            <ArrowRight className="size-4 shrink-0 text-text-muted" />
            <span className="truncate text-text-muted">{localizedFileName}</span>
          </div>
          <Button size="sm" onClick={() => navigate("/dashboard")}>
            <Upload className="size-4" /> 파일 업로드
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-5">
        <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <section className="rounded-[24px] bg-surface p-5">
            <p className="text-[13px] font-bold text-text-muted">원본</p>
            <div className="mx-auto mt-3 aspect-square w-full max-w-[400px] rounded-[20px] bg-background p-10">
              <div className="relative size-full">
                {renderArtwork()}
                <span className="absolute inset-x-4 bottom-8 text-center text-[32px] font-extrabold text-text-primary">
                  {activeImage.sourceText}
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-[24px] bg-surface p-5">
            <p className="text-[13px] font-bold text-text-muted">
              미리보기 — 글자를 끌어서 옮길 수 있어요
            </p>
            <div className="mx-auto mt-3 aspect-square w-full max-w-[400px] rounded-[20px] bg-background p-10">
              <div className="relative size-full">
                {renderArtwork()}
                <input
                  value={activeText}
                  aria-label="번역 문구"
                  onChange={(event) =>
                    updateImage(activeImage.id, { editedText: event.target.value })
                  }
                  className="absolute inset-x-2 bottom-7 h-14 rounded-md border-2 border-brand bg-background/90 px-3 text-center font-extrabold outline-none"
                  style={{
                    color: textStyle.color,
                    fontFamily: "'Pretendard Variable', 'Pretendard', sans-serif",
                    fontSize: `${textStyle.fontSize}px`,
                    transform: `rotate(${textStyle.rotation}deg)`,
                  }}
                />
              </div>
            </div>
          </section>
        </div>

        <section className="mt-4 flex flex-wrap items-center gap-3 rounded-[20px] border border-border px-5 py-4">
          <h2 className="mr-1 text-sm font-bold text-text-muted">번역 추천</h2>
          {activeImage.translations.map((translation) => {
            const selected = translation.text === activeImage.selectedTranslation
            return (
              <button
                key={translation.text}
                type="button"
                onClick={() =>
                  updateImage(activeImage.id, {
                    selectedTranslation: translation.text,
                    editedText: undefined,
                  })
                }
                className={cn(
                  "rounded-full px-5 py-2.5 text-[15px] font-bold transition-colors",
                  selected
                    ? "bg-brand-soft text-brand"
                    : "bg-surface text-text-primary hover:bg-surface-hover",
                )}
              >
                {translation.text}
              </button>
            )
          })}
        </section>

        <section className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-4 rounded-[20px] border border-border px-5 py-4">
          <h2 className="text-sm font-bold text-text-muted">글자 꾸미기</h2>
          <div className="rounded-xl bg-surface px-4 py-2 text-sm font-bold text-text-primary">
            Pretendard
          </div>
          <label className="flex items-center gap-3 text-sm font-semibold text-text-muted">
            크기
            <input
              type="range"
              min="20"
              max="52"
              value={textStyle.fontSize}
              onChange={(event) => updateTextStyle({ fontSize: Number(event.target.value) })}
              className="accent-brand"
            />
          </label>
          <label className="flex items-center gap-3 text-sm font-semibold text-text-muted">
            회전
            <input
              type="range"
              min="-20"
              max="20"
              value={textStyle.rotation}
              onChange={(event) => updateTextStyle({ rotation: Number(event.target.value) })}
              className="accent-brand"
            />
          </label>
          <label className="flex items-center gap-3 text-sm font-semibold text-text-muted">
            색
            <input
              type="color"
              value={textStyle.color}
              onChange={(event) => updateTextStyle({ color: event.target.value })}
              className="size-9 cursor-pointer rounded-full border-0 bg-transparent p-0"
            />
          </label>
          <Button size="sm" className="ml-auto" onClick={() => window.alert("PNG 내보내기는 다음 단계에서 연결됩니다.")}>
            <Download className="size-4" /> 내보내기
          </Button>
        </section>

        <section className="mt-5 flex flex-wrap gap-3">
          {project.images.map((image) => (
            <button
              key={image.id}
              type="button"
              aria-label={`${image.sourceText} 이모티콘 편집`}
              onClick={() => setActiveImageId(image.id)}
              className={cn(
                "size-16 overflow-hidden rounded-2xl border-2 bg-surface p-1.5 transition-colors",
                image.id === activeImage.id ? "border-brand" : "border-transparent",
              )}
            >
              {image.previewUrl ? (
                <img
                  src={image.previewUrl}
                  alt=""
                  className="size-full rounded-xl object-cover"
                />
              ) : (
                <Emoticon phrase={image.sourceText} />
              )}
            </button>
          ))}
        </section>
      </main>
    </div>
  )
}
