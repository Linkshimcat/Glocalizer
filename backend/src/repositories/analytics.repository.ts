import type { AnalyticsEventRow } from '../analytics/types.js';
import { supabase } from '../config/supabase.js';
import { AppError } from '../errors/app-error.js';
import type { ExperimentGroup } from '../types/analytics.js';

const COLUMNS = 'event_name, client_event_id, occurred_at, anonymous_session_id, project_id, experiment_group, duration_ms, image_count';
// PostgREST는 한 번에 최대 1,000행만 돌려주므로 나눠서 읽는다.
const PAGE_SIZE = 1000;

/** 같은 client_event_id가 다시 오면(클라이언트 재시도, 작업 재실행) 조용히 무시한다. */
export async function insertAnalyticsEvent(row: AnalyticsEventRow): Promise<void> {
  const { error } = await supabase.from('analytics_events').upsert(row, { onConflict: 'client_event_id', ignoreDuplicates: true });
  if (!error) return;
  if ((error as { code?: string }).code === '23503') {
    throw new AppError('INVALID_REQUEST', { field: 'projectId' }, '존재하지 않는 프로젝트입니다.');
  }
  throw new AppError('INTERNAL_ERROR', { cause: error.message }, '분석 이벤트 저장에 실패했습니다.');
}

export async function listAnalyticsEvents(group: ExperimentGroup): Promise<AnalyticsEventRow[]> {
  const rows: AnalyticsEventRow[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('analytics_events')
      .select(COLUMNS)
      .eq('experiment_group', group)
      .order('occurred_at', { ascending: true })
      .order('client_event_id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new AppError('INTERNAL_ERROR', { cause: error.message }, '분석 이벤트 조회에 실패했습니다.');
    rows.push(...((data ?? []) as AnalyticsEventRow[]));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}
