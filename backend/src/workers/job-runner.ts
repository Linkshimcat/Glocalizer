import { logger } from '../config/logger.js';
import { describeError } from '../errors/app-error.js';
import { claimNextQueuedJob, markJobCompleted, markJobFailedOrRequeue, touchJobLease } from '../repositories/job.repository.js';
import { env } from '../config/env.js';
import { updateProjectStage } from '../repositories/project.repository.js';
import { handleProcessProjectJob } from './process-project.job.js';

let activeJobCount = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 종료 전 진행 중인 job이 모두 끝났는지 확인한다. timeout이면 false를 반환한다. */
export async function waitForActiveJobs(timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (activeJobCount > 0 && Date.now() < deadline) await sleep(Math.min(100, deadline - Date.now()));
  return activeJobCount === 0;
}

/** 큐에서 job 하나를 처리한다. 처리할 job이 없으면 false를 반환한다. */
export async function processClaimedJob(job: import('../types/job.js').JobRow): Promise<void> {
  logger.info({ jobId: job.id, projectId: job.project_id, attempt: job.attempts }, 'Job 시작');
  activeJobCount += 1;
  const heartbeat = setInterval(() => {
    void touchJobLease(job.id).then((owned) => {
      if (!owned) logger.warn({ jobId: job.id }, 'Job lease를 잃어 heartbeat를 중단합니다.');
    }).catch((err: unknown) => logger.warn({ err, jobId: job.id }, 'Job lease heartbeat 실패'));
  }, env.JOB_HEARTBEAT_INTERVAL_MS);
  heartbeat.unref();

  try {
    await handleProcessProjectJob(job);
    const completed = await markJobCompleted(job.id);
    if (completed) logger.info({ jobId: job.id }, 'Job 완료');
    else logger.warn({ jobId: job.id }, '다른 worker가 Job lease를 인계해 완료 상태를 기록하지 않았습니다.');
  } catch (err) {
    const { code: errorCode, message: errorMessage } = describeError(err, 'INTERNAL_ERROR', '작업 처리 중 알 수 없는 오류가 발생했습니다.');
    logger.error({ err, jobId: job.id }, 'Job 실패');

    const outcome = await markJobFailedOrRequeue(job, errorCode, errorMessage);
    if (outcome === 'failed') await updateProjectStage(job.project_id, { status: 'failed', errorCode, errorMessage });
    if (outcome === 'lease-lost') logger.warn({ jobId: job.id }, '다른 worker가 Job lease를 인계해 실패 상태를 기록하지 않았습니다.');
  } finally {
    clearInterval(heartbeat);
    activeJobCount -= 1;
  }
}

export async function processNextJob(): Promise<boolean> {
  const job = await claimNextQueuedJob();
  if (!job) return false;
  await processClaimedJob(job);

  return true;
}
