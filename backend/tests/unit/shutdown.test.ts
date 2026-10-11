import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createServer, request } from 'node:http';
const stops=vi.hoisted(()=>({worker:vi.fn(),generation:vi.fn(),cleanup:vi.fn()}));
vi.mock('../../src/workers/worker.js',()=>({stopWorker:stops.worker}));
vi.mock('../../src/workers/generation-worker.js',()=>({stopGenerationWorker:stops.generation}));
vi.mock('../../src/workers/cleanup-scheduler.js',()=>({stopExpiredProjectsSweep:stops.cleanup}));
vi.mock('../../src/workers/job-runner.js',()=>({waitForActiveJobs:vi.fn().mockResolvedValue(true)}));
beforeEach(()=>{vi.resetModules();for(const stop of Object.values(stops))stop.mockReset().mockResolvedValue(undefined);});
describe('one shutdown deadline',()=>{
 it('waits for generation and cleanup even when HTTP has already closed',async()=>{
  let release!:()=>void;stops.generation.mockImplementation(()=>new Promise<void>(r=>{release=r}));
  const server=createServer();await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
  const {shutdownServer}=await import('../../src/workers/shutdown.js');
  let finished=false;const result=shutdownServer(server,500).then(value=>{finished=true;return value});
  await new Promise(r=>setTimeout(r,15));expect(finished).toBe(false);release();expect(await result).toBe(true);
  expect(stops.cleanup).toHaveBeenCalledOnce();
 });
 it('bounds hung HTTP and generation with the same deadline',async()=>{
  stops.generation.mockImplementation(()=>new Promise(()=>{}));
  let entered!:()=>void;const incoming=new Promise<void>(r=>{entered=r});
  const server=createServer(()=>entered());await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
  const address=server.address() as {port:number};const client=request(`http://127.0.0.1:${address.port}/`);client.on('error',()=>{});client.end();await incoming;
  const {shutdownServer}=await import('../../src/workers/shutdown.js');
  const start=Date.now();expect(await shutdownServer(server,40)).toBe(false);expect(Date.now()-start).toBeLessThan(250);
  const {taskSignal,isShuttingDown}=await import('../../src/utils/task-context.js');expect(taskSignal().aborted).toBe(true);expect(isShuttingDown()).toBe(true);client.destroy();
 });
});
