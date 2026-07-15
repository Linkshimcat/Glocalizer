import { useCallback, useRef, useState } from "react"
import { FileUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface UploadZoneProps {
  onFiles: (files: File[]) => void
  disabled?: boolean
}

export function UploadZone({ onFiles, disabled }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      if (disabled) return
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/"),
      )
      if (files.length) onFiles(files)
    },
    [disabled, onFiles],
  )

  return (
    <div
      id="emoticon-upload-zone"
      onDragOver={(e) => {
        e.preventDefault()
        if (!disabled) setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "relative flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-[28px] border-2 border-dashed px-6 py-10 text-center transition-colors",
        dragging
          ? "border-brand bg-brand-soft"
          : "border-border bg-background hover:border-brand/60 hover:bg-surface/40",
        disabled && "pointer-events-none opacity-60",
      )}
    >
      <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-surface text-text-primary">
        <FileUp className="size-7" strokeWidth={2.2} />
      </div>
      <h3 className="text-[18px] font-bold text-foreground">
        여기에 파일을 끌어다 놓으세요
      </h3>
      <p className="mt-2 max-w-sm text-sm font-medium text-text-muted">
        또는 클릭해서 파일을 선택하세요
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          if (files.length) onFiles(files)
          e.target.value = ""
        }}
      />
    </div>
  )
}
