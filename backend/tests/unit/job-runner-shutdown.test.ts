import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/repositories/job.repository.js', () => ({
  claimNextQueuedJob: vi.fn(),
  markJobCompleted: vi.fn(),
  markJobFailedOrRequeue: vi.fn(),
  touchJobLease: vi.fn(),
}));
vi.mock('../../src/repositories/project.repository.js', () => ({ updateProjectStage: vi.fn() }));
vi.mock('../../src/workers/process-project.job.js', () => ({ handleProcessProjectJob: vi.fn() }));

const processor = await import('../../src/workers/process-project.job.js');
const { processClaimedJob, waitForActiveJobs } = await import('../../src/workers/job-runner.js');

const job = {
  id: 'job-shutdown', project_id: 'project-shutdown', status: 'running' as const, stage: null, progress: 0,
  attempts: 1, max_attempts: 3, locked_at: new Date().toISOString(), worker_id: 'worker-test', heartbeat_at: new Date().toISOString(),
  started_at: new Date().toISOString(), completed_at: null, error_code: null, error_message: null, created_at: new Date().toISOString(),
};

describe('job shutdown wait', () => {
  it('진행 중인 job이 grace 시간 안에 끝나면 종료 대기를 해제한다', async () => {
    let release: (() => void) | undefined;
    vi.mocked(processor.handleProcessProjectJob).mockImplementation(() => new Promise<void>((resolve) => { release = resolve; }));

    const processing = processClaimedJob(job);
    await Promise.resolve();
    const waiting = waitForActiveJobs(1_000);
    release?.();

    await expect(waiting).resolves.toBe(true);
    await processing;
  });

  it('grace 시간 내에 끝나지 않는 job은 false를 반환한다', async () => {
    let release: (() => void) | undefined;
    vi.mocked(processor.handleProcessProjectJob).mockImplementation(() => new Promise<void>((resolve) => { release = resolve; }));

    const processing = processClaimedJob(job);
    await Promise.resolve();
    await expect(waitForActiveJobs(1)).resolves.toBe(false);
    release?.();
    await processing;
  });
});
