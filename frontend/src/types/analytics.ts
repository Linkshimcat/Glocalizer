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

/** 측정값이 없으면 null — 화면에서 0이 아니라 "측정 안 됨"으로 표시한다 */
export interface ProofPercentiles {
  p50Ms: number | null
  p95Ms: number | null
  sampleCount: number
}

/** GET /api/v1/proof/summary 응답 */
export interface ProofSummary {
  groups: ExperimentGroup[]
  periodStart: string | null
  periodEnd: string | null
  sampleCount: number
  /** localization_started 대비 export_succeeded 비율(0~1) */
  completionRate: number | null
  stages: {
    ocr: ProofPercentiles
    translation: ProofPercentiles
    cleanup: ProofPercentiles
    total: ProofPercentiles
  }
}
