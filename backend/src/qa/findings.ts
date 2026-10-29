import type { QaFinding, Severity } from '../types/qa.js';

const SEVERITY_RANK: Record<Severity, number> = { pass: 0, review: 1, fail: 2 };

/** 모델 의견(ai_suggestion)은 사람이 확인할 사항일 뿐이라 fail로 올리지 않는다. 최대 review. */
export function capAiSuggestionSeverity(finding: QaFinding): QaFinding {
  return finding.source === 'ai_suggestion' && finding.severity === 'fail' ? { ...finding, severity: 'review' } : finding;
}

/** 이미지별 최종 판정은 그 이미지 finding 중 가장 나쁜 severity다. finding이 없는 검사 대상 이미지는 pass로 센다. */
export function countVerdicts(findings: QaFinding[], imageIds: string[]): { pass: number; review: number; fail: number } {
  const worst = new Map<string, Severity>(imageIds.map((id) => [id, 'pass']));
  for (const finding of findings) {
    const current = worst.get(finding.imageId);
    if (current !== undefined && SEVERITY_RANK[finding.severity] > SEVERITY_RANK[current]) worst.set(finding.imageId, finding.severity);
  }
  const counts = { pass: 0, review: 0, fail: 0 };
  for (const severity of worst.values()) counts[severity] += 1;
  return counts;
}
