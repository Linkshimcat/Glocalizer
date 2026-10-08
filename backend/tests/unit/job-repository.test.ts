import { describe, expect, it, vi } from 'vitest';
const supabase = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('../../src/config/supabase.js', () => ({ supabase }));
vi.mock('../../src/config/runtime.js', () => ({ runtime: { workerId: 'worker-test' } }));
const { insertJob } = await import('../../src/repositories/job.repository.js');
describe('atomic enqueue', () => {
  it('maps the database admission conflict to 409', async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: { message: 'PROCESS_ALREADY_RUNNING' } });
    await expect(insertJob('project-1')).rejects.toMatchObject({ code: 'PROCESS_ALREADY_RUNNING' });
  });
  it('returns the queued row without bypassing the worker', async () => {
    supabase.rpc.mockResolvedValue({data:{id:'job',status:'queued'},error:null});
    expect(await insertJob('project-1')).toEqual({id:'job',status:'queued'});
    expect(supabase.rpc).toHaveBeenLastCalledWith('enqueue_localization_job',{p_project:'project-1',p_statuses:['uploaded'],p_payload:{}});
  });
});
