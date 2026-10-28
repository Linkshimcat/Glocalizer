import { ArrowUpRight, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { QaCopy } from '../../i18n/qa'
import type { QaEvidenceSource, QaFinding } from '../../types/qa'
import { effectiveSeverity, imageSeverity, type QaImage } from './qaReport'
import SeverityBadge from './SeverityBadge'

interface EvidenceDrawerProps {
  image: QaImage
  findings: QaFinding[]
  copy: QaCopy
  onClose?: () => void
  /** 없으면 읽기 전용 — "에디터에서 고치기" 링크를 숨긴다 */
  fixLink?: (finding: QaFinding | null) => string
}

const SECTIONS: QaEvidenceSource[] = ['rule', 'ai_suggestion', 'user']

/**
 * 선택한 이미지의 판정 근거. 기획안 4-2에 따라 결정적 규칙 판정(rule)과 모델 의견
 * (ai_suggestion)을 다른 구역에 나눠, AI 의견이 FAIL처럼 보이지 않게 한다.
 */
export default function EvidenceDrawer({ image, findings, copy, onClose, fixLink }: EvidenceDrawerProps) {
  const sectionTitle = (source: QaEvidenceSource) => source === 'rule' ? copy.qaRuleSection : source === 'ai_suggestion' ? copy.qaAiSection : copy.qaUserSection
  const sectionDesc = (source: QaEvidenceSource) => source === 'rule' ? copy.qaRuleSectionDesc : source === 'ai_suggestion' ? copy.qaAiSectionDesc : null

  return (
    <aside aria-labelledby="qa-evidence-title" className="rounded-panel border border-gray-100 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-sub">{copy.qaDrawerTitle}</p>
          <h2 id="qa-evidence-title" className="mt-1 truncate text-lg font-extrabold text-ink">{image.name}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <SeverityBadge severity={imageSeverity(findings)} copy={copy} />
          {onClose && (
            <button type="button" onClick={onClose} aria-label={copy.qaDrawerClose} className="flex h-9 w-9 items-center justify-center rounded-control text-sub hover:bg-surface">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {findings.length === 0 && <p className="mt-5 text-sm text-sub">{copy.qaNoFindings}</p>}

      {SECTIONS.map(source => {
        const items = findings.filter(finding => finding.source === source)
        if (items.length === 0) return null
        const desc = sectionDesc(source)
        return (
          <section key={source} className="mt-5">
            <h3 className="text-sm font-extrabold text-ink">{sectionTitle(source)}</h3>
            {desc && <p className="mt-0.5 text-xs text-sub">{desc}</p>}
            <ul className="mt-3 flex flex-col gap-3">
              {items.map((finding, index) => (
                <li key={`${finding.code}-${index}`} className="rounded-control border border-gray-100 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-ink">{finding.message}</p>
                    <SeverityBadge severity={effectiveSeverity(finding)} copy={copy} className="shrink-0" />
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-sub">{finding.code}</p>
                  <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                    {finding.measuredValue !== undefined && <><dt className="text-sub">{copy.qaMeasured}</dt><dd className="font-medium text-ink">{String(finding.measuredValue)}</dd></>}
                    {finding.criterion && <><dt className="text-sub">{copy.qaCriterion}</dt><dd className="font-medium text-ink">{finding.criterion}</dd></>}
                    {finding.recommendation && <><dt className="text-sub">{copy.qaRecommendation}</dt><dd className="font-medium text-ink">{finding.recommendation}</dd></>}
                  </dl>
                  {fixLink && effectiveSeverity(finding) !== 'pass' && (
                    <Link to={fixLink(finding)} className="mt-3 inline-flex min-h-9 items-center gap-1 text-sm font-bold text-brand hover:underline">
                      {copy.qaFixInEditor}
                      <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </aside>
  )
}
