import { currentAccountToken, currentCloudProjectId } from '../../lib/analytics'
import { isQaReportStale, type QaFinding, type QaProjectResponse } from '../../types/qa'
import { fetchQaProject } from './qaApi'
import { effectiveSeverity, findingsByImage, imageSeverity } from './qaReport'

const FETCH_LIMIT_MS = 5000

/**
 * FEAT-09: ZIP 내보내기에 넣을 최신 QA 결과. 다운로드를 절대 막지 않도록 5초 안에 못 받거나
 * 실패하면 null — 그 경우 ZIP에는 리포트 없이 PNG만 들어간다.
 */
export async function fetchQaForExport(): Promise<QaProjectResponse | null> {
  const projectId = currentCloudProjectId()
  const token = currentAccountToken()
  if (!projectId || !token) return null
  // 5초 제한용 타이머는 요청이 먼저 끝나면 바로 지운다(PR #207 리뷰) — 남겨 두면 ZIP을 만들 때마다 타이머가 쌓인다.
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const timeout = new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), FETCH_LIMIT_MS) })
    return await Promise.race([fetchQaProject(projectId, token, null), timeout])
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

interface ExportedImage {
  assetId?: string
  name: string
}

function line(finding: QaFinding) {
  const parts = [`- **${effectiveSeverity(finding).toUpperCase()}** \`${finding.code}\` ${finding.message}`]
  if (finding.measuredValue !== undefined) parts.push(`측정값 ${finding.measuredValue}`)
  if (finding.criterion) parts.push(`기준 ${finding.criterion}`)
  if (finding.recommendation) parts.push(`조치: ${finding.recommendation}`)
  return parts.join(' · ')
}

/** qa-report.json(원본 그대로 + 내보낸 시각·파일 목록)과 사람이 읽는 qa-report.md를 만든다. */
export function buildQaReportFiles(response: QaProjectResponse, images: ExportedImage[], exportedAt = new Date()) {
  const report = response.latest
  if (!report) return null
  const stale = isQaReportStale(response)
  const grouped = findingsByImage(report)
  // 같은 이미지가 언어별로 여러 장 나가므로 assetId 기준으로 한 번만 센다.
  const unique = [...new Map(images.filter(image => image.assetId).map(image => [image.assetId!, image])).values()]

  const json = JSON.stringify({
    exportedAt: exportedAt.toISOString(),
    staleSinceLastInspection: stale,
    currentRevision: response.currentRevision ?? null,
    disclaimer: 'PASS means the image passed Glocalizer’s own checks. It does not guarantee approval by OGQ Market.',
    report,
  }, null, 2)

  const rows = unique.map(image => {
    const findings = grouped.get(image.assetId!) ?? []
    return `| ${image.name.replace(/\|/g, '\\|')} | ${imageSeverity(findings).toUpperCase()} | ${findings.length} |`
  })
  const details = unique.flatMap(image => {
    const findings = grouped.get(image.assetId!) ?? []
    if (findings.length === 0) return []
    const rule = findings.filter(finding => finding.source !== 'ai_suggestion')
    const ai = findings.filter(finding => finding.source === 'ai_suggestion')
    return [
      `### ${image.name}`,
      ...(rule.length ? ['규칙 검사', ...rule.map(line)] : []),
      ...(ai.length ? [...(rule.length ? [''] : []), 'AI 의견 (참고용, FAIL로 판정하지 않음)', ...ai.map(line)] : []),
      '',
    ]
  })

  const md = [
    '# Glocalizer QA 검사 리포트',
    '',
    `- 프로젝트: \`${report.projectId}\``,
    `- 검사 시각: ${report.inspectedAt}`,
    `- 검사 기준 버전: ${report.rulesetVersion}`,
    `- 검사한 편집 상태: \`${report.imageRevision}\``,
    `- 내보낸 시각: ${exportedAt.toISOString()}`,
    '',
    ...(stale ? ['> ⚠️ 마지막 검사 이후 편집한 내용이 있습니다. 이 리포트는 편집 전 상태 기준입니다.', ''] : []),
    '> PASS는 Glocalizer 자체 검사를 통과했다는 뜻이며, OGQ 마켓의 승인이나 심사 합격을 보장하지 않습니다.',
    '',
    '## 이미지별 판정',
    '',
    '| 파일 | 판정 | 항목 수 |',
    '| --- | --- | ---: |',
    ...rows,
    '',
    ...(details.length ? ['## 상세', '', ...details] : []),
  ].join('\n')

  return { json, md }
}
