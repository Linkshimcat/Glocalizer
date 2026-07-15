import type { UploadedFile } from "@/types/project"
import { X } from "lucide-react"
import { Emoticon } from "@/components/common/Emoticon"

interface UploadedFileListProps {
  files: UploadedFile[]
  onRemove: (id: string) => void
}

export function UploadedFileList({ files, onRemove }: UploadedFileListProps) {
  if (files.length === 0) return null

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
      {files.map((file) => (
        <li
          key={file.id}
          className="group relative overflow-hidden rounded-[22px] bg-surface p-3"
        >
          <div className="aspect-square overflow-hidden rounded-2xl bg-background">
            {file.previewUrl ? (
              <img
                src={file.previewUrl}
                alt={file.name}
                className="size-full object-cover"
              />
            ) : (
              <Emoticon phrase={file.sourceText} className="size-full" />
            )}
          </div>
          <div className="mt-3 min-w-0">
            <p className="truncate text-sm font-bold text-foreground">
              {file.name}
            </p>
            {file.status === "success" ? (
              <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">
                감지 문구 ·{" "}
                <span className="font-semibold text-foreground">
                  {file.sourceText}
                </span>
              </p>
            ) : (
              <p className="text-xs font-medium text-destructive">
                {file.errorReason ?? "문구를 감지하지 못했습니다"}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onRemove(file.id)}
            aria-label={`${file.name} 제거`}
            className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-background/90 text-text-muted opacity-0 shadow-sm transition-opacity hover:text-text-primary group-hover:opacity-100 focus:opacity-100"
          >
            <X className="size-4" />
          </button>
        </li>
      ))}
    </ul>
  )
}
