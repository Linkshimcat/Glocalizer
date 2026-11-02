import type { AnalyticsEventName, ExperimentGroup, LocalizationStage } from '../types/analytics.js';
import type { AnalyticsEventRow } from './types.js';

export const ANALYTICS_EVENT_NAMES: AnalyticsEventName[] = [
  'demo_started', 'localization_started', 'localization_completed', 'qa_reviewed', 'export_succeeded', 'export_failed',
];

export const LOCALIZATION_STAGES: LocalizationStage[] = ['recognizing', 'translating', 'cleaning'];

export interface DurationStats {
  n: number;
  p50Ms: number;
  p95Ms: number;
}

export interface ProofSummary {
  experimentGroup: ExperimentGroup;
  /** 첫·마지막 이벤트 시각. 표본이 없으면 null. */
  period: { from: string; to: string } | null;
  /** 서로 다른 익명 세션 수 */
  sampleSize: number;
  eventCounts: Record<AnalyticsEventName, number>;
  /** 시작한 프로젝트 중 내보내기에 성공한 프로젝트 비율. 시작한 프로젝트가 없으면 rate는 null. */
  completion: { startedProjects: number; exportedProjects: number; rate: number | null };
  /** 이벤트별 durationMs 분포. 표본이 없으면 null(화면에서 "측정 안 됨"). */
  durations: Record<AnalyticsEventName, DurationStats | null>;
  /** 현지화 완료 이벤트의 단계별 분포(OCR·번역·정리). 단계 기록이 없으면 null. */
  stageDurations: Record<LocalizationStage, DurationStats | null>;
}

/** nearest-rank 방식. 원자료(CSV)만으로 같은 값을 다시 계산할 수 있게 보간하지 않는다. */
export function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)]!;
}

export function summarizeEvents(rows: AnalyticsEventRow[], experimentGroup: ExperimentGroup): ProofSummary {
  const eventCounts = Object.fromEntries(ANALYTICS_EVENT_NAMES.map((name) => [name, 0])) as Record<AnalyticsEventName, number>;
  const durationSamples = Object.fromEntries(ANALYTICS_EVENT_NAMES.map((name) => [name, [] as number[]])) as Record<AnalyticsEventName, number[]>;
  const stageSamples = Object.fromEntries(LOCALIZATION_STAGES.map((stage) => [stage, [] as number[]])) as Record<LocalizationStage, number[]>;
  const sessions = new Set<string>();
  const startedProjects = new Set<string>();
  const exportedProjects = new Set<string>();
  let from: string | null = null;
  let to: string | null = null;

  for (const row of rows) {
    eventCounts[row.event_name] += 1;
    sessions.add(row.anonymous_session_id);
    if (row.duration_ms !== null) durationSamples[row.event_name].push(row.duration_ms);
    if (row.event_name === 'localization_completed') {
      for (const stage of LOCALIZATION_STAGES) {
        const value = row.stage_durations?.[stage];
        if (typeof value === 'number') stageSamples[stage].push(value);
      }
    }
    if (row.project_id && row.event_name === 'localization_started') startedProjects.add(row.project_id);
    if (row.project_id && row.event_name === 'export_succeeded') exportedProjects.add(row.project_id);
    const at = new Date(row.occurred_at).toISOString();
    if (from === null || at < from) from = at;
    if (to === null || at > to) to = at;
  }

  const exportedAfterStart = [...exportedProjects].filter((id) => startedProjects.has(id)).length;
  const durations = Object.fromEntries(ANALYTICS_EVENT_NAMES.map((name) => {
    const samples = durationSamples[name];
    return [name, samples.length === 0 ? null : { n: samples.length, p50Ms: percentile(samples, 50), p95Ms: percentile(samples, 95) }];
  })) as Record<AnalyticsEventName, DurationStats | null>;

  const stageDurations = Object.fromEntries(LOCALIZATION_STAGES.map((stage) => {
    const samples = stageSamples[stage];
    return [stage, samples.length === 0 ? null : { n: samples.length, p50Ms: percentile(samples, 50), p95Ms: percentile(samples, 95) }];
  })) as Record<LocalizationStage, DurationStats | null>;

  return {
    experimentGroup,
    period: from && to ? { from, to } : null,
    sampleSize: sessions.size,
    eventCounts,
    completion: {
      startedProjects: startedProjects.size,
      exportedProjects: exportedAfterStart,
      rate: startedProjects.size === 0 ? null : exportedAfterStart / startedProjects.size,
    },
    durations,
    stageDurations,
  };
}

/**
 * 그룹은 서버가 정한다. 팀원 계정이면 무조건 internal이고, 클라이언트가 스스로 internal이라고 할 수는 없다.
 * Demo Lab이 보낸 demo는 그대로 둔다.
 */
export function resolveExperimentGroup(claimed: ExperimentGroup, accountEmail: string | null, internalEmails: string[]): ExperimentGroup {
  if (accountEmail && internalEmails.includes(accountEmail.trim().toLowerCase())) return 'internal';
  return claimed === 'demo' ? 'demo' : 'external';
}

const CSV_COLUMNS: Array<keyof AnalyticsEventRow> = [
  'event_name', 'client_event_id', 'occurred_at', 'anonymous_session_id', 'project_id', 'experiment_group', 'duration_ms', 'image_count',
];

function csvCell(value: string | number | null): string {
  if (value === null) return '';
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** 단계별 시간은 컬럼으로 풀어 낸다(recognizing_ms 등). 기록이 없는 행은 비워 두므로 앞의 컬럼 순서는 그대로다. */
export function eventsToCsv(rows: AnalyticsEventRow[]): string {
  const header = [...CSV_COLUMNS, ...LOCALIZATION_STAGES.map((stage) => `${stage}_ms`)];
  const lines = [header.join(','), ...rows.map((row) => [
    ...CSV_COLUMNS.map((column) => csvCell(row[column] as string | number | null)),
    ...LOCALIZATION_STAGES.map((stage) => csvCell(row.stage_durations?.[stage] ?? null)),
  ].join(','))];
  return `${lines.join('\n')}\n`;
}
