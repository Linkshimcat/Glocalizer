import { describe, expect, it, vi } from 'vitest';

const supabase = vi.hoisted(() => ({ from: vi.fn() }));

vi.mock('../../src/config/supabase.js', () => ({ supabase }));
vi.mock('../../src/config/runtime.js', () => ({ runtime: { workerId: 'worker-test' } }));

const { insertJob } = await import('../../src/repositories/job.repository.js');

describe('insertJob', () => {
  it('DB의 활성 job unique 제약 위반은 409 PROCESS_ALREADY_RUNNING으로 바꾼다', async () => {
    const leaseProbe = { select: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue({ data: null, error: null }) }) };
    const insert = {
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { code: '23505', message: 'duplicate active job' } }),
        }),
      }),
    };
    const activeJob = { id: 'already-running-job' };
    const activeLookup = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: activeJob, error: null }) }),
            }),
          }),
        }),
      }),
    };
    vi.mocked(supabase.from)
      .mockReturnValueOnce(leaseProbe as never)
      .mockReturnValueOnce(insert as never)
      .mockReturnValueOnce(activeLookup as never);

    await expect(insertJob('project-1')).rejects.toMatchObject({
      code: 'PROCESS_ALREADY_RUNNING',
      details: { projectId: 'project-1', jobId: 'already-running-job' },
    });
  });
});
