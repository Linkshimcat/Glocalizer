import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/repositories/job.repository.js', () => ({
  claimNextQueuedJob: vi.fn(),
  markJobCompleted: vi.fn(),
  markJobFailedOrRequeue: vi.fn(),
  touchJobLease: vi.fn(),
}));

vi.mock('../../src/repositories/project.repository.js', () => ({ updateProjectStage: vi.fn() }));
vi.mock('../../src/workers/process-project.job.js', () => ({ handleProcessProjectJob: vi.fn() }));

const jobRepo = await import('../../src/repositories/job.repository.js');
const projectRepo = await import('../../src/repositories/project.repository.js');
const processor = await import('../../src/workers/process-project.job.js');
const { processClaimedJob, processNextJob } = await import('../../src/workers/job-runner.js');

const job = {
  id: 'job-1',
  project_id: 'project-1',
  status: 'running' as const,
  stage: null,
  progress: 0,
  attempts: 1,
  max_attempts: 3,
  locked_at: new Date().toISOString(),
  worker_id: 'worker-test',
  heartbeat_at: new Date().toISOString(),
  started_at: new Date().toISOString(),
  completed_at: null,
  error_code: null,
  error_message: null,
  created_at: new Date().toISOString(),
};

describe('job runner', () => {
  beforeEach(() => vi.clearAllMocks());

  it('일시 오류면 프로젝트를 실패시키지 않고 작업을 재큐잉한다', async () => {
    vi.mocked(processor.handleProcessProjectJob).mockRejectedValue(new Error('provider timed out'));
    vi.mocked(jobRepo.markJobFailedOrRequeue).mockResolvedValue('requeued');

    await processClaimedJob(job);

    expect(jobRepo.markJobFailedOrRequeue).toHaveBeenCalledWith(job, 'INTERNAL_ERROR', '작업 처리 중 알 수 없는 오류가 발생했습니다.');
    expect(projectRepo.updateProjectStage).not.toHaveBeenCalled();
    expect(jobRepo.markJobCompleted).not.toHaveBeenCalled();
  });

  it('재시도 횟수를 모두 쓰면 프로젝트를 최종 실패로 기록한다', async () => {
    vi.mocked(processor.handleProcessProjectJob).mockRejectedValue(new Error('provider timed out'));
    vi.mocked(jobRepo.markJobFailedOrRequeue).mockResolvedValue('failed');

    await processClaimedJob(job);

    expect(projectRepo.updateProjectStage).toHaveBeenCalledWith('project-1', {
      status: 'failed',
      errorCode: 'INTERNAL_ERROR',
      errorMessage: '작업 처리 중 알 수 없는 오류가 발생했습니다.',
    });
  });

  it('대기 작업이 없으면 worker는 처리하지 않는다', async () => {
    vi.mocked(jobRepo.claimNextQueuedJob).mockResolvedValue(null);

    await expect(processNextJob()).resolves.toBe(false);
    expect(processor.handleProcessProjectJob).not.toHaveBeenCalled();
  });
});
