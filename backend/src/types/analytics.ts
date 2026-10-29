// 분석 이벤트 공용 계약 — docs/TeamWork/README.md 6-3.
// 이미지·번역문·이메일·실명은 이 타입에 넣지 않는다. 필드를 늘릴 때도 개인정보가 아닌지 먼저 확인한다.

export type AnalyticsEventName =
  | 'demo_started'
  | 'localization_started'
  | 'localization_completed'
  | 'qa_reviewed'
  | 'export_succeeded'
  | 'export_failed';

export type ExperimentGroup = 'internal' | 'external' | 'demo';

export interface AnalyticsEvent {
  eventName: AnalyticsEventName;
  /** 재시도 중복 제거용 UUID */
  clientEventId: string;
  occurredAt: string;
  anonymousSessionId: string;
  projectId?: string;
  experimentGroup: ExperimentGroup;
  durationMs?: number;
  imageCount?: number;
}
