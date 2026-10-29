import type { AnalyticsEventName, ExperimentGroup } from '../types/analytics.js';

/** analytics_events 테이블 행. 이미지·번역문·이메일·실명은 이 테이블에 들어가지 않는다. */
export interface AnalyticsEventRow {
  event_name: AnalyticsEventName;
  client_event_id: string;
  occurred_at: string;
  anonymous_session_id: string;
  project_id: string | null;
  experiment_group: ExperimentGroup;
  duration_ms: number | null;
  image_count: number | null;
}
