import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('../../src/config/env.js',()=>({env:{JOB_HEARTBEAT_INTERVAL_MS:100,JOB_STALE_AFTER_MS:500}}));
vi.mock('../../src/config/logger.js',()=>({logger:{warn:vi.fn()}}));
const {startHeartbeat}=await import('../../src/utils/heartbeat.js');
afterEach(()=>vi.useRealTimers());
describe('serial lease heartbeat',()=>{
 it('aborts on ownership loss and stops further pulses',async()=>{
  vi.useFakeTimers();const controller=new AbortController();const touch=vi.fn().mockResolvedValue(false);
  const stop=startHeartbeat(touch,controller,'job');await vi.advanceTimersByTimeAsync(100);
  expect(controller.signal.aborted).toBe(true);await vi.advanceTimersByTimeAsync(1000);expect(touch).toHaveBeenCalledTimes(1);stop();
 });
 it('does not overlap slow pulses and cancels an indefinitely hanging heartbeat at expiry',async()=>{
  vi.useFakeTimers();const controller=new AbortController();const touch=vi.fn(()=>new Promise<boolean>(()=>{}));
  const stop=startHeartbeat(touch,controller,'job');await vi.advanceTimersByTimeAsync(499);
  expect(touch).toHaveBeenCalledTimes(1);expect(controller.signal.aborted).toBe(false);
  await vi.advanceTimersByTimeAsync(1);expect(controller.signal.aborted).toBe(true);stop();
 });
 it('failed pulses never extend the deadline; successful pulses do',async()=>{
  vi.useFakeTimers();const controller=new AbortController();const touch=vi.fn().mockResolvedValueOnce(true).mockRejectedValue(new Error('db offline'));
  const stop=startHeartbeat(touch,controller,'job');await vi.advanceTimersByTimeAsync(599);expect(controller.signal.aborted).toBe(false);
  await vi.advanceTimersByTimeAsync(1);expect(controller.signal.aborted).toBe(true);stop();
 });
});
