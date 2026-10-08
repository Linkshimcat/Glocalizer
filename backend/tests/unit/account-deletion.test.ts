import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({rpc: vi.fn(), remove: vi.fn(), deleteAuth: vi.fn()}));
vi.mock('../../src/config/supabase.js', () => ({supabase:{rpc:mocks.rpc,auth:{admin:{deleteUser:mocks.deleteAuth}}}}));
vi.mock('../../src/repositories/storage.repository.js', () => ({removeFromStorage:mocks.remove}));
const { deleteDurably, retryPendingDeletions } = await import('../../src/services/deletion.service.js');
const task = {id:'delete-task',target_id:'owner',lease_token:'lease',paths:['original.png','failed-attempt.png'],auth_user_id:'auth-id'};
beforeEach(()=>{
 vi.clearAllMocks();mocks.remove.mockResolvedValue(undefined);mocks.deleteAuth.mockResolvedValue({error:null});
 mocks.rpc.mockImplementation(async name=>({error:null,data:name==='reserve_deletion'?task.id:name==='claim_deletion'?task:true}));
});
describe('durable account deletion',()=>{
 it('rejects active work before touching storage or the linked account',async()=>{
  mocks.rpc.mockResolvedValueOnce({data:null,error:{message:'PROCESS_ALREADY_RUNNING'}});
  await expect(deleteDurably('account','owner')).rejects.toMatchObject({code:'PROCESS_ALREADY_RUNNING'});
  expect(mocks.remove).not.toHaveBeenCalled();expect(mocks.deleteAuth).not.toHaveBeenCalled();
 });
 it('removes the complete manifest then linked auth then database rows',async()=>{
  await deleteDurably('account','owner');
  expect(mocks.remove).toHaveBeenCalledWith(task.paths);
  expect(mocks.remove.mock.invocationCallOrder[0]).toBeLessThan(mocks.deleteAuth.mock.invocationCallOrder[0]);
  const finish=mocks.rpc.mock.calls.findIndex(([name])=>name==='finish_deletion');
  expect(mocks.deleteAuth.mock.invocationCallOrder[0]).toBeLessThan(mocks.rpc.mock.invocationCallOrder[finish]);
  expect(mocks.rpc).toHaveBeenLastCalledWith('finish_deletion',{p_id:task.id,p_lease:task.lease_token});
 });
 it('persists a retry after a partial storage failure and keeps auth/database data',async()=>{
  mocks.remove.mockRejectedValueOnce(new Error('storage unavailable'));
  await expect(deleteDurably('account','owner')).rejects.toThrow('storage unavailable');
  expect(mocks.deleteAuth).not.toHaveBeenCalled();
  expect(mocks.rpc).toHaveBeenLastCalledWith('finish_deletion',{p_id:task.id,p_lease:task.lease_token,p_error:'storage unavailable'});
 });
 it('does not discard a linked-auth failure',async()=>{
  mocks.deleteAuth.mockResolvedValueOnce({error:{status:503,message:'unavailable'}});
  await expect(deleteDurably('account','owner')).rejects.toMatchObject({code:'INTERNAL_ERROR'});
  expect(mocks.rpc).toHaveBeenLastCalledWith('finish_deletion',expect.objectContaining({p_error:expect.any(String)}));
 });
 it('retries a saved manifest without needing the original account rows',async()=>{
  let claims=0;
  mocks.rpc.mockImplementation(async name=>({error:null,data:name==='claim_deletion'?(claims++===0?task:null):true}));
  await retryPendingDeletions();
  expect(mocks.remove).toHaveBeenCalledWith(task.paths);
  expect(mocks.rpc).toHaveBeenCalledWith('finish_deletion',{p_id:task.id,p_lease:task.lease_token});
 });
 it('treats an already removed linked-auth user as successful',async()=>{
  mocks.deleteAuth.mockResolvedValueOnce({error:{status:404,code:'user_not_found'}});
  await expect(deleteDurably('account','owner')).resolves.toBeUndefined();
 });
});
