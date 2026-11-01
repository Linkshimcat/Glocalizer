/**
 * 본선 Performance & Quality Proof(C-04) 공용 계약 — docs/finals/README.md 6-2·6-3과 1:1로 대응한다.
 * 이벤트에는 이미지·번역문·이메일·실명 같은 개인정보를 넣지 않는다.
 */

export type AnalyticsEventName =
  | 'demo_started'
  | 'localization_started'
  | 'localization_completed'
  | 'qa_reviewed'
  | 'export_succeeded'
  | 'export_failed'

/** internal 판정은 서버가 계정 목록으로 다시 하므로, 클라이언트 값은 참고용이다 */
export type ExperimentGroup = 'internal' | 'external' | 'demo'

/** POST /api/v1/events 요청 본문 */
export interface AnalyticsEvent {
  eventName: AnalyticsEventName
  /** 재시도 중복 제거용 UUID */
  clientEventId: string
  occurredAt: string
  anonymousSessionId: string
  projectId?: string
  experimentGroup: ExperimentGroup
  durationMs?: number
  imageCount?: number
}

/** 이벤트 하나의 durationMs 분포(nearest-rank). 표본이 없으면 해당 이벤트 값이 null → "측정 안 됨" */
export interface ProofDurationStats {
  n: number
  p50Ms: number
  p95Ms: number
}

/**
 * GET /api/v1/proof/summary?group=<external|internal|demo> 응답 — backend/src/analytics/proof.ts와 같은 모양.
 * 요청한 그룹 하나만 집계한다. 관리자 키(X-Admin-Key)가 필요하다.
 */
export interface ProofSummary {
  experimentGroup: ExperimentGroup
  /** 첫·마지막 이벤트 시각. 표본이 없으면 null */
  period: { from: string; to: string } | null
  /** 서로 다른 익명 세션 수 */
  sampleSize: number
  eventCounts: Record<AnalyticsEventName, number>
  /** 시작한 프로젝트 중 내보내기에 성공한 프로젝트 비율. 시작한 프로젝트가 없으면 rate는 null */
  completion: { startedProjects: number; exportedProjects: number; rate: number | null }
  durations: Record<AnalyticsEventName, ProofDurationStats | null>
}

/**
 * GET /api/v1/proof/export.csv?group=... 열 — backend/src/analytics/proof.ts CSV_COLUMNS.
 * frontend/scripts/verify-proof.mjs가 이 열로 summary를 다시 계산해 화면 숫자와 맞는지 점검한다(QA-02).
 */
export const PROOF_CSV_COLUMNS = ['event_name', 'client_event_id', 'occurred_at', 'anonymous_session_id', 'project_id', 'experiment_group', 'duration_ms', 'image_count'] as const
