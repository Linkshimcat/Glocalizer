import { logger } from '../config/logger.js';
import { describeError } from '../errors/app-error.js';
import { claimNextQueuedJob, markJobCompleted, markJobFailedOrRequeue } from '../repositories/job.repository.js';
import { updateProjectStage } from '../repositories/project.repository.js';
import { handleProcessProjectJob } from './process-project.job.js';

/** 큐에서 job 하나를 처리한다. 처리할 job이 없으면 false를 반환한다. */
export async function processNextJob(): Promise<boolean> {
  const job = await claimNextQueuedJob();
  if (!job) return false;

  logger.info({ jobId: job.id, projectId: job.project_id, attempt: job.attempts }, 'Job 시작');

  try {
    await handleProcessProjectJob(job);
    await markJobCompleted(job.id);
    logger.info({ jobId: job.id }, 'Job 완료');
  } catch (err) {
    const { code: errorCode, message: errorMessage } = describeError(err, 'INTERNAL_ERROR', '작업 처리 중 알 수 없는 오류가 발생했습니다.');
    logger.error({ err, jobId: job.id }, 'Job 실패');

    const outcome = await markJobFailedOrRequeue(job, errorCode, errorMessage);
    if (outcome === 'failed') {
      await updateProjectStage(job.project_id, { status: 'failed', errorCode, errorMessage });
    }
  }

  return true;
}
