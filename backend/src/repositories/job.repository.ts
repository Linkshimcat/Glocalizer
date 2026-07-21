import { supabase } from '../config/supabase.js';
import { unwrapList, unwrapNullableRow, unwrapRow, unwrapVoid } from '../utils/db-result.js';
import type { JobRow } from '../types/job.js';

export async function insertJob(projectId: string): Promise<JobRow> {
  const result = await supabase.from('jobs').insert({ project_id: projectId }).select().single();
  return unwrapRow<JobRow>(result, '작업을 생성하지 못했습니다.');
}

export async function findActiveJobForProject(projectId: string): Promise<JobRow | null> {
  const result = await supabase.from('jobs').select().eq('project_id', projectId).in('status', ['queued', 'running']).maybeSingle();
  return unwrapNullableRow<JobRow>(result, '작업 조회에 실패했습니다.');
}

/**
 * 큐에서 가장 오래된 job 하나를 골라 잠근다. 이 서버는 in-process worker 하나만 돌리는 것을
 * 전제로 하므로(MVP), WHERE status='queued' 가드로 최소한의 경쟁 조건만 방지한다.
 * 다른 워커가 먼저 채갔으면 업데이트된 행이 0개라 null을 반환한다.
 */
export async function claimNextQueuedJob(): Promise<JobRow | null> {
  const selectResult = await supabase.from('jobs').select().eq('status', 'queued').order('created_at', { ascending: true }).limit(1);
  const [candidate] = unwrapList<JobRow>(selectResult, '대기 중인 작업 조회에 실패했습니다.');
  if (!candidate) return null;

  const updateResult = await supabase
    .from('jobs')
    .update({
      status: 'running',
      locked_at: new Date().toISOString(),
      started_at: new Date().toISOString(),
      attempts: candidate.attempts + 1,
    })
    .eq('id', candidate.id)
    .eq('status', 'queued')
    .select()
    .maybeSingle();

  return unwrapNullableRow<JobRow>(updateResult, '작업을 잠그지 못했습니다.');
}

export async function markJobCompleted(jobId: string): Promise<void> {
  const result = await supabase
    .from('jobs')
    .update({ status: 'completed', progress: 100, completed_at: new Date().toISOString() })
    .eq('id', jobId);

  unwrapVoid(result, '작업 완료 처리에 실패했습니다.');
}

/** attempts < max_attempts면 재시도를 위해 다시 큐에 넣고, 아니면 최종 실패로 마감한다. */
export async function markJobFailedOrRequeue(job: JobRow, errorCode: string, errorMessage: string): Promise<'requeued' | 'failed'> {
  if (job.attempts < job.max_attempts) {
    const result = await supabase
      .from('jobs')
      .update({ status: 'queued', locked_at: null, error_code: errorCode, error_message: errorMessage })
      .eq('id', job.id);

    unwrapVoid(result, '작업 재시도 처리에 실패했습니다.');
    return 'requeued';
  }

  const result = await supabase
    .from('jobs')
    .update({ status: 'failed', error_code: errorCode, error_message: errorMessage, completed_at: new Date().toISOString() })
    .eq('id', job.id);

  unwrapVoid(result, '작업 실패 처리에 실패했습니다.');
  return 'failed';
}
