import type { QaCopy } from '../../i18n/qa'
import type { QaFinding, QaRegion, QaReport, QaSeverity } from '../../types/qa'

/** QA Board·Demo Lab이 함께 쓰는 이미지 정보. 썸네일과 영역 표시에 필요한 만큼만 둔다. */
export interface QaImage {
  id: string
  name: string
  url: string | null
  /** 원본 픽셀 크기 — finding.region(원본 px)을 썸네일 위 비율로 바꿀 때 쓴다 */
  width: number | null
  height: number | null
  /**
   * 서버가 판정하는 이미지인지. 서버(INSPECTABLE_STATUSES)는 상태가 completed/failed인 이미지만 검사하므로,
   * 처리 중인 이미지는 finding이 없어도 PASS가 아니라 "검사 전"이다.
   */
  inspectable: boolean
}

/** 서버가 검사하는 에셋 상태 — backend/src/qa/inputs.ts INSPECTABLE_STATUSES와 같게 유지한다. */
const INSPECTABLE_STATUSES = new Set(['completed', 'failed'])
export function isInspectableStatus(status: string): boolean {
  return INSPECTABLE_STATUSES.has(status)
}

/** pending = 검사 대상이 아니라서(처리 중 등) 아직 판정이 없는 이미지 */
export type QaVerdict = QaSeverity | 'pending'

const SEVERITY_RANK: Record<QaSeverity, number> = { pass: 0, review: 1, fail: 2 }

/** 모델 의견은 계약상 최대 review — 서버가 잘못 fail을 보내도 화면에서 FAIL로 세지 않는다. */
export function effectiveSeverity(finding: QaFinding): QaSeverity {
  return finding.source === 'ai_suggestion' && finding.severity === 'fail' ? 'review' : finding.severity
}

export function findingsByImage(report: QaReport | null): Map<string, QaFinding[]> {
  const grouped = new Map<string, QaFinding[]>()
  for (const finding of report?.findings ?? []) {
    const list = grouped.get(finding.imageId)
    if (list) list.push(finding)
    else grouped.set(finding.imageId, [finding])
  }
  return grouped
}

/** 이미지의 판정은 가장 나쁜 finding을 따른다. finding이 없으면 통과다. */
export function imageSeverity(findings: QaFinding[] | undefined): QaSeverity {
  let worst: QaSeverity = 'pass'
  for (const finding of findings ?? []) {
    const severity = effectiveSeverity(finding)
    if (SEVERITY_RANK[severity] > SEVERITY_RANK[worst]) worst = severity
  }
  return worst
}

/**
 * 서버는 검사한 이미지마다 finding을 하나 이상 남긴다(파이프라인 항목은 항상 나온다). 그래서 finding이 하나도 없는
 * 이미지는 아직 검사하지 않은 것이다 — 통과로 세면 검사 기록이 없는 프로젝트에 PASS가 뜬다.
 */
export function imageVerdict(image: QaImage, findings: QaFinding[] | undefined): QaVerdict {
  return image.inspectable && findings && findings.length > 0 ? imageSeverity(findings) : 'pending'
}

/** 검사 대상이 아닌 이미지는 PASS로 세지 않고 pending으로 따로 센다 — 서버 이력의 숫자와 맞추기 위해서다. */
export function severityCounts(images: QaImage[], grouped: Map<string, QaFinding[]>): Record<QaVerdict, number> {
  const counts: Record<QaVerdict, number> = { pass: 0, review: 0, fail: 0, pending: 0 }
  for (const image of images) counts[imageVerdict(image, grouped.get(image.id))]++
  return counts
}

/** 원본 px 사각형을 이미지 대비 0~1 비율로 바꾼다. 크기를 모르면 null. */
export function normalizeRegion(region: QaRegion, image: QaImage): QaRegion | null {
  if (!image.width || !image.height) return null
  return {
    x: region.x / image.width,
    y: region.y / image.height,
    width: region.width / image.width,
    height: region.height / image.height,
  }
}

/**
 * 에디터 딥링크. 계약(README 6-1)의 region은 원본 px지만, 에디터는 region 파라미터를
 * 0~1 normalizedBox와 근접 비교하므로(Editor.tsx QA 딥링크 2단계) 여기서 비율로 바꿔 보낸다.
 */
export function editorLink(projectId: string, image: QaImage, region?: QaRegion): string {
  const params = new URLSearchParams({ projectId, asset: image.id, from: 'qa' })
  const normalized = region ? normalizeRegion(region, image) : null
  if (normalized) params.set('region', [normalized.x, normalized.y, normalized.width, normalized.height].map(value => value.toFixed(4)).join(','))
  return `/editor?${params.toString()}`
}

export function severityLabel(severity: QaSeverity, copy: QaCopy) {
  return severity === 'pass' ? copy.qaSeverityPass : severity === 'review' ? copy.qaSeverityReview : copy.qaSeverityFail
}

export function severityHint(severity: QaSeverity, copy: QaCopy) {
  return severity === 'pass' ? copy.qaSeverityPassHint : severity === 'review' ? copy.qaSeverityReviewHint : copy.qaSeverityFailHint
}
