import { AppError } from '../errors/app-error.js';
import { findAssetsByIds } from '../repositories/asset.repository.js';
import { findActiveJobForProject, insertJob } from '../repositories/job.repository.js';

/** 실패한 asset 하나만 uploaded 상태로 되돌려 기존 project job pipeline에 다시 넣는다. */
export async function retryFailedAsset(projectId: string, assetId: string): Promise<{ jobId: string; status: string; job: import('../types/job.js').JobRow }> {
  const activeJob = await findActiveJobForProject(projectId);
  if (activeJob) throw new AppError('PROCESS_ALREADY_RUNNING', { projectId, jobId: activeJob.id });

  const [asset] = await findAssetsByIds(projectId, [assetId]);
  if (!asset) throw new AppError('INVALID_REQUEST', { assetId }, '해당 프로젝트에 속하지 않는 이미지입니다.');
  if (asset.status !== 'failed') throw new AppError('INVALID_REQUEST', { assetId, status: asset.status }, '실패한 이미지만 다시 처리할 수 있습니다.');

  const job = await insertJob(projectId, ['failed'], { operation: 'retry', assetId });
  return { jobId: job.id, status: job.status, job };
}
