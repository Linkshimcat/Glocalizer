/**
 * 본선 Visual QA(C-02) 공용 계약 — docs/finals/README.md 6-1·6-2와 1:1로 대응한다.
 * 백엔드 backend/src/types/qa.ts(윤재)와 같은 모양을 유지해야 하므로, 바꿀 때는 양쪽을 함께 고친다.
 */

export type QaSeverity = 'pass' | 'review' | 'fail'

/** rule = 결정적 판정, ai_suggestion = 모델 의견(최대 review), user = 사용자가 남긴 판단 */
export type QaEvidenceSource = 'rule' | 'ai_suggestion' | 'user'

export type QaFindingCode =
  // 규격: 서버가 최종 PNG를 직접 다시 읽어 판정
  | 'SPEC_FORMAT' | 'SPEC_FILE_SIZE' | 'SPEC_DIMENSIONS' | 'SPEC_TRANSPARENCY' | 'SPEC_MARGIN'
  // 파이프라인 결과: DB 상태로 판정
  | 'OCR_NO_TEXT' | 'OCR_LOW_CONFIDENCE' | 'TRANSLATION_MISSING' | 'CLEANUP_MANUAL_REQUIRED' | 'IMAGE_LOAD_FAILED'
  // 배치: 에디터가 측정해 editor state(layoutMetrics)에 저장한 값으로 판정
  | 'TEXT_OVERFLOW' | 'TEXT_OUTSIDE_CAPTION'
  // 모델 의견: 절대 fail로 올리지 않는다
  | 'AI_READABILITY' | 'AI_CULTURE_RISK'

/** 원본 이미지 픽셀 기준 사각형 */
export interface QaRegion {
  x: number
  y: number
  width: number
  height: number
}

export interface QaFinding {
  code: QaFindingCode
  severity: QaSeverity
  source: QaEvidenceSource
  message: string
  /** assets.id */
  imageId: string
  region?: QaRegion
  measuredValue?: number | string
  /** 예: "≤ 1 MB", "740×640" */
  criterion?: string
  recommendation?: string
}

export interface QaReport {
  id: string
  projectId: string
  /** editor state 갱신 시각 또는 해시 — 같은 상태를 다시 검사했는지 구분한다 */
  imageRevision: string
  inspectedAt: string
  /** 예: "2026-10-27.1" */
  rulesetVersion: string
  findings: QaFinding[]
}

export interface QaHistoryEntry {
  id: string
  inspectedAt: string
  pass: number
  review: number
  fail: number
}

/** GET /api/v1/projects/:projectId/qa 응답 */
export interface QaProjectResponse {
  latest: QaReport | null
  history: QaHistoryEntry[]
}
