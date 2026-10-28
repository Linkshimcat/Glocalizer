import { Image as ImageIcon } from 'lucide-react'
import type { QaCopy } from '../../i18n/qa'
import type { QaFinding, QaSeverity } from '../../types/qa'
import { effectiveSeverity, imageSeverity, normalizeRegion, type QaImage } from './qaReport'
import SeverityBadge from './SeverityBadge'

const REGION_TONE: Record<QaSeverity, string> = {
  pass: 'border-emerald-500',
  review: 'border-amber-500',
  fail: 'border-red-500',
}

interface QaGridProps {
  images: QaImage[]
  grouped: Map<string, QaFinding[]>
  copy: QaCopy
  /** 'all'이면 전부, 아니면 해당 판정의 이미지만 보여준다 */
  filter?: QaSeverity | 'all'
  selectedId?: string | null
  /** 없으면 읽기 전용(Demo Lab 등) — 카드를 눌러도 아무 일도 없다 */
  onSelect?: (imageId: string) => void
}

/** 24장 그리드. 이미지마다 판정 배지와, 영역이 있는 finding의 위치를 썸네일 위에 표시한다. */
export default function QaGrid({ images, grouped, copy, filter = 'all', selectedId = null, onSelect }: QaGridProps) {
  const visible = images.filter(image => filter === 'all' || imageSeverity(grouped.get(image.id)) === filter)
  if (visible.length === 0) return <p className="rounded-panel border border-dashed border-gray-200 p-8 text-center text-sm text-sub">{copy.qaFilteredEmpty}</p>

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      {visible.map(image => {
        const findings = grouped.get(image.id) ?? []
        const severity = imageSeverity(findings)
        const selected = selectedId === image.id
        const card = (
          <>
            <span className="relative block overflow-hidden rounded-control bg-surface" style={{ aspectRatio: image.width && image.height ? `${image.width} / ${image.height}` : '1 / 1' }}>
              {image.url
                ? <img src={image.url} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-fill" />
                : <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center text-sub"><ImageIcon className="h-6 w-6" /></span>}
              {findings.map((finding, index) => {
                const box = finding.region ? normalizeRegion(finding.region, image) : null
                if (!box) return null
                return (
                  <span
                    key={index}
                    aria-hidden="true"
                    className={`absolute rounded-sm border-2 ${REGION_TONE[effectiveSeverity(finding)]}`}
                    style={{ left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.width * 100}%`, height: `${box.height * 100}%` }}
                  />
                )
              })}
              <SeverityBadge severity={severity} copy={copy} className="absolute left-1.5 top-1.5 shadow-sm" />
            </span>
            <span className="mt-2 block truncate text-xs font-medium text-sub" title={image.name}>{image.name}</span>
          </>

        )
        return (
          <li key={image.id}>
            {onSelect
              ? (
                <button
                  type="button"
                  onClick={() => onSelect(image.id)}
                  aria-pressed={selected}
                  className={`block w-full rounded-panel border bg-white p-2 text-left transition hover:border-brand/60 focus-visible:outline-2 focus-visible:outline-brand ${selected ? 'border-brand ring-2 ring-brand/30' : 'border-gray-100'}`}
                >
                  {card}
                </button>
              )
              : <div className="rounded-panel border border-gray-100 bg-white p-2">{card}</div>}
          </li>
        )
      })}
    </ul>
  )
}
