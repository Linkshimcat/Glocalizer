// QA 공용 계약 — docs/TeamWork/README.md 6-1. 바꾸려면 래원·소연·예나 모두와 합의가 필요하다.

export type Severity = 'pass' | 'review' | 'fail';

/** rule = 결정적 판정, ai_suggestion = 모델 의견, user = 사용자가 직접 넣은 값. 화면에서 섞어 보이지 않는다. */
export type EvidenceSource = 'rule' | 'ai_suggestion' | 'user';

export type QaFindingCode =
  // 규격 (서버가 PNG를 직접 다시 읽어 판정, source='rule')
  | 'SPEC_FORMAT'
  | 'SPEC_FILE_SIZE'
  | 'SPEC_DIMENSIONS'
  | 'SPEC_TRANSPARENCY'
  | 'SPEC_MARGIN'
  // 파이프라인 결과 (DB 상태로 판정, source='rule')
  | 'OCR_NO_TEXT'
  | 'OCR_LOW_CONFIDENCE'
  | 'TRANSLATION_MISSING'
  | 'CLEANUP_MANUAL_REQUIRED'
  | 'IMAGE_LOAD_FAILED'
  // 배치 (에디터가 측정해 저장, source='rule')
  | 'TEXT_OVERFLOW'
  | 'TEXT_OUTSIDE_CAPTION'
  // 모델 의견 (source='ai_suggestion', 절대 fail로 올리지 않음)
  | 'AI_READABILITY'
  | 'AI_CULTURE_RISK';

export interface QaRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface QaFinding {
  code: QaFindingCode;
  severity: Severity;
  source: EvidenceSource;
  message: string;
  /** assets.id */
  imageId: string;
  /** 원본 이미지 px 기준 */
  region?: QaRegion;
  measuredValue?: number | string;
  /** 예: "≤ 1 MB", "740×640" */
  criterion?: string;
  recommendation?: string;
}

export interface QaReport {
  id: string;
  projectId: string;
  /** editor_states 갱신 시각 또는 해시 — 같은 상태를 다시 검사했는지 구분한다. */
  imageRevision: string;
  inspectedAt: string;
  /** 예: "2026-10-27.1" */
  rulesetVersion: string;
  findings: QaFinding[];
}

/** GET /projects/:projectId/qa 이력 한 줄. 이미지별 최종 판정(가장 나쁜 severity)을 센 값이다. */
export interface QaHistoryEntry {
  id: string;
  inspectedAt: string;
  pass: number;
  review: number;
  fail: number;
}

export interface QaSummaryResponse {
  latest: QaReport | null;
  history: QaHistoryEntry[];
}
