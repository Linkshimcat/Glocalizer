import { logger } from '../config/logger.js';
import { describeError } from '../errors/app-error.js';
import { claimNextQueuedJob, markJobCompleted, markJobFailedOrRequeue, touchJobLease } from '../repositories/job.repository.js';
import { handleProcessProjectJob } from './process-project.job.js';
import { LeaseLostError } from '../repositories/job-mutation.js';
import { withTask, taskSignal } from '../utils/task-context.js';
import { startHeartbeat } from '../utils/heartbeat.js';
import type { JobRow } from '../types/job.js';
let activeJobCount=0;
export async function waitForActiveJobs(timeoutMs:number):Promise<boolean>{
 const deadline=Date.now()+timeoutMs;
 while(activeJobCount>0&&Date.now()<deadline)await new Promise(r=>setTimeout(r,Math.min(100,deadline-Date.now())));
 return activeJobCount===0;
}
export async function processClaimedJob(job:JobRow):Promise<void>{
 if(!job.lease_token)throw new LeaseLostError();
 activeJobCount++;
 const controller=new AbortController();
 try{
  await withTask({kind:'localization',id:job.id,projectId:job.project_id,leaseToken:job.lease_token,assetIds:job.asset_ids,controller},async()=>{
   const stopHeartbeat=startHeartbeat(()=>touchJobLease(job.id),controller,job.id);
   try{
    logger.info({jobId:job.id,attempt:job.attempts},'Job started');
    await handleProcessProjectJob(job);taskSignal().throwIfAborted();
    if(!await markJobCompleted(job.id))logger.warn({jobId:job.id},'Job lease lost before completion');
   }catch(err){
    if(controller.signal.aborted||taskSignal().aborted||err instanceof LeaseLostError){logger.warn({jobId:job.id},'Job cancelled; stale attempt will not publish');return;}
    const {code,message}=describeError(err,'INTERNAL_ERROR','작업 처리 중 알 수 없는 오류가 발생했습니다.');
    const outcome=await markJobFailedOrRequeue(job,code,message);
    logger.warn({err,jobId:job.id,outcome},'Job failed');
   }finally{stopHeartbeat();}
  });
 }finally{activeJobCount--;}
}
export async function processNextJob():Promise<boolean>{
 const job=await claimNextQueuedJob();if(!job)return false;await processClaimedJob(job);return true;
}
