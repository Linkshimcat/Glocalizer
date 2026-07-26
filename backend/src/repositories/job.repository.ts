import { supabase } from '../config/supabase.js';
import { runtime } from '../config/runtime.js';
import { AppError } from '../errors/app-error.js';
import { unwrapList, unwrapNullableRow, unwrapRow } from '../utils/db-result.js';
import type { JobRow } from '../types/job.js';

let jobLeaseSupport: Promise<boolean> | null = null;

/** 무중단 배포 중 migration 전 서버도 동작하도록 lease 컬럼 존재 여부를 한 번만 확인한다. */
async function supportsJobLeases(): Promise<boolean> {
  if (!jobLeaseSupport) {
    jobLeaseSupport = (async () => {
      const result = await supabase.from('jobs').select('worker_id, heartbeat_at', { head: true }).limit(1);
      if (!result.error) return true;
      // PostgREST 버전에 따라 존재하지 않는 컬럼의 head 요청이 code/message 없이 빈 객체로 오기도 한다.
      if (result.error.code === 'PGRST204' || result.error.message === '' || /worker_id|heartbeat_at/i.test(result.error.message)) return false;
      throw result.error;
    })();
  }
  return jobLeaseSupport;
}

export async function insertJob(projectId: string): Promise<JobRow> {
  const now = new Date().toISOString();
  const leaseEnabled = await supportsJobLeases();
  // 작업 생성 시 바로 이 backend instance가 소유한다. 동일 Supabase를 보는 구버전
  // worker가 queued job을 가로채 다른 provider로 처리하는 것을 막는다.
  const result = await supabase.from('jobs').insert({
    project_id: projectId,
    status: 'running',
    attempts: 1,
    locked_at: now,
    ...(leaseEnabled ? { worker_id: runtime.workerId, heartbeat_at: now } : {}),
    started_at: now,
  }).select().single();
  if (result.error?.code === '23505') {
    const activeJob = await findActiveJobForProject(projectId);
    throw new AppError('PROCESS_ALREADY_RUNNING', { projectId, jobId: activeJob?.id }, '이미 처리 중인 프로젝트입니다.');
  }
  return unwrapRow<JobRow>(result, '작업을 생성하지 못했습니다.');
}

export async function findActiveJobForProject(projectId: string): Promise<JobRow | null> {
  const result = await supabase
    .from('jobs')
    .select()
    .eq('project_id', projectId)
    .in('status', ['queued', 'running'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
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

  const leaseEnabled = await supportsJobLeases();
  const now = new Date().toISOString();
  const updateResult = await supabase
    .from('jobs')
    .update({
      status: 'running',
      locked_at: now,
      ...(leaseEnabled ? { worker_id: runtime.workerId, heartbeat_at: now } : {}),
      started_at: now,
      attempts: candidate.attempts + 1,
    })
    .eq('id', candidate.id)
    .eq('status', 'queued')
    .select()
    .maybeSingle();

  return unwrapNullableRow<JobRow>(updateResult, '작업을 잠그지 못했습니다.');
}

export async function markJobCompleted(jobId: string): Promise<boolean> {
  const leaseEnabled = await supportsJobLeases();
  const update = {
    status: 'completed', progress: 100, completed_at: new Date().toISOString(),
    ...(leaseEnabled ? { heartbeat_at: new Date().toISOString() } : {}),
  };
  const query = supabase
    .from('jobs')
    .update(update)
    .eq('id', jobId);
  const result = leaseEnabled
    ? await query.eq('status', 'running').eq('worker_id', runtime.workerId).select('id')
    : await query.select('id');

  return unwrapList<{ id: string }>(result, '작업 완료 처리에 실패했습니다.').length > 0;
}

export async function markJobFailed(jobId: string, errorCode: string, errorMessage: string): Promise<boolean> {
  const leaseEnabled = await supportsJobLeases();
  const update = {
    status: 'failed', error_code: errorCode, error_message: errorMessage, completed_at: new Date().toISOString(),
    ...(leaseEnabled ? { heartbeat_at: new Date().toISOString() } : {}),
  };
  const query = supabase
    .from('jobs')
    .update(update)
    .eq('id', jobId);
  const result = leaseEnabled
    ? await query.eq('status', 'running').eq('worker_id', runtime.workerId).select('id')
    : await query.select('id');
  return unwrapList<{ id: string }>(result, '작업 실패 상태를 저장하지 못했습니다.').length > 0;
}

/** 서버가 종료돼 lease만 남은 job을 재시작 뒤 다시 처리 가능하게 만든다. */
export async function requeueStaleRunningJobs(staleBefore: Date): Promise<number> {
  const leaseEnabled = await supportsJobLeases();
  const update = {
    status: 'queued',
    locked_at: null,
    started_at: null,
    error_code: leaseEnabled ? 'WORKER_LEASE_EXPIRED' : 'WORKER_RECOVERED',
    error_message: leaseEnabled ? '작업 worker 연결이 끊겨 다시 시도합니다.' : '서버 재시작 후 작업을 다시 시도합니다.',
    ...(leaseEnabled ? { worker_id: null, heartbeat_at: null } : {}),
  };
  const result = await supabase
    .from('jobs')
    .update(update)
    .eq('status', 'running')
    .lt(leaseEnabled ? 'heartbeat_at' : 'locked_at', staleBefore.toISOString())
    .select('id');
  return unwrapList<{ id: string }>(result, '중단된 작업을 복구하지 못했습니다.').length;
}

/** attempts < max_attempts면 재시도를 위해 다시 큐에 넣고, 아니면 최종 실패로 마감한다. */
export async function markJobFailedOrRequeue(job: JobRow, errorCode: string, errorMessage: string): Promise<'requeued' | 'failed' | 'lease-lost'> {
  const leaseEnabled = await supportsJobLeases();
  if (job.attempts < job.max_attempts) {
    const query = supabase
      .from('jobs')
      .update({
        status: 'queued', locked_at: null, error_code: errorCode, error_message: errorMessage,
        ...(leaseEnabled ? { worker_id: null, heartbeat_at: null } : {}),
      })
      .eq('id', job.id);
    const result = leaseEnabled
      ? await query.eq('status', 'running').eq('worker_id', runtime.workerId).select('id')
      : await query.select('id');

    const requeued = unwrapList<{ id: string }>(result, '작업 재시도 처리에 실패했습니다.').length > 0;
    return requeued ? 'requeued' : 'lease-lost';
  }

  const query = supabase
    .from('jobs')
    .update({
      status: 'failed', error_code: errorCode, error_message: errorMessage, completed_at: new Date().toISOString(),
      ...(leaseEnabled ? { heartbeat_at: new Date().toISOString() } : {}),
    })
    .eq('id', job.id);
  const result = leaseEnabled
    ? await query.eq('status', 'running').eq('worker_id', runtime.workerId).select('id')
    : await query.select('id');

  return unwrapList<{ id: string }>(result, '작업 실패 처리에 실패했습니다.').length > 0 ? 'failed' : 'lease-lost';
}

/** 작업 중인 worker가 아직 살아 있음을 기록한다. lease를 잃은 경우 false를 반환한다. */
export async function touchJobLease(jobId: string): Promise<boolean> {
  if (!await supportsJobLeases()) return true;
  const result = await supabase
    .from('jobs')
    .update({ heartbeat_at: new Date().toISOString() })
    .eq('id', jobId)
    .eq('status', 'running')
    .eq('worker_id', runtime.workerId)
    .select('id');
  return unwrapList<{ id: string }>(result, '작업 lease 갱신에 실패했습니다.').length > 0;
}
