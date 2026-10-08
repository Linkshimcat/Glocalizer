import { beforeEach, expect, it, vi } from 'vitest';
import { spawn } from 'node:child_process';
beforeEach(()=>vi.resetModules());
it('cancels an in-flight fetch and refuses more work after cancellation',async()=>{
 const {withTask,taskFetch}=await import('../../src/utils/task-context.js');
 const controller=new AbortController();const reason=new Error('lease lost');
 const fake=vi.fn((_url:unknown,init:RequestInit)=>new Promise<Response>((_r,reject)=>init.signal!.addEventListener('abort',()=>reject(init.signal!.reason),{once:true})));
 vi.stubGlobal('fetch',fake);
 try {
  const work=withTask({kind:'localization',id:'job',projectId:'project',leaseToken:'lease',controller},async()=>{
   const response=taskFetch('https://fixture.invalid');controller.abort(reason);await expect(response).rejects.toThrow('lease lost');
   expect(()=>taskFetch('https://fixture.invalid')).toThrow('lease lost');
  });await work;expect(fake).toHaveBeenCalledOnce();
 }finally{vi.unstubAllGlobals();}
});
it('terminates an OCR child process on task cancellation',async()=>{
 const {withTask,cancelChildOnAbort}=await import('../../src/utils/task-context.js');const controller=new AbortController();
 await withTask({kind:'localization',id:'job',projectId:'project',leaseToken:'lease',controller},async()=>{
  const child=spawn(process.execPath,['-e','setInterval(()=>{},1000)']);cancelChildOnAbort(child);
  const exit=new Promise<string|null>(r=>child.once('exit',(_code,signal)=>r(signal)));controller.abort();expect(await exit).toBe('SIGKILL');
 });
});
