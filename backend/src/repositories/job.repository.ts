import { supabase } from '../config/supabase.js';
import { runtime } from '../config/runtime.js';
import { env } from '../config/env.js';
import { AppError } from '../errors/app-error.js';
import { unwrapNullableRow, unwrapRow } from '../utils/db-result.js';
import { currentTask } from '../utils/task-context.js';
import type { JobRow } from '../types/job.js';

export async function insertJob(projectId:string,statuses:string[]=['uploaded'],payload:Record<string,unknown>={}):Promise<JobRow>{
 const result=await supabase.rpc('enqueue_localization_job',{p_project:projectId,p_statuses:statuses,p_payload:payload});
 if(result.error){
  const code=['PROCESS_ALREADY_RUNNING','PROJECT_NOT_FOUND','UPLOAD_NOT_COMPLETED'].find(code=>result.error!.message.includes(code));
  if(code) throw new AppError(code as 'PROCESS_ALREADY_RUNNING'|'PROJECT_NOT_FOUND'|'UPLOAD_NOT_COMPLETED',{projectId});
 }
 return unwrapRow<JobRow>(result,'작업 생성 실패');
}
export async function findActiveJobForProject(projectId:string):Promise<JobRow|null>{
 const result=await supabase.from('jobs').select().eq('project_id',projectId).in('status',['queued','running']).order('created_at',{ascending:false}).limit(1).maybeSingle();
 return unwrapNullableRow<JobRow>(result,'작업 조회 실패');
}
export async function claimNextQueuedJob():Promise<JobRow|null>{
 return unwrapNullableRow<JobRow>(await supabase.rpc('claim_localization_job',{p_worker:runtime.workerId}),'작업 점유 실패');
}
async function finish(jobId:string,errorCode:string|null=null,errorMessage:string|null=null,retry=true):Promise<string>{
 const task=currentTask();if(!task||task.kind!=='localization'||task.id!==jobId)return 'lease-lost';
 return unwrapRow<string>(await supabase.rpc('finish_localization_job',{p_job:jobId,p_lease:task.leaseToken,p_error_code:errorCode,p_error_message:errorMessage,p_retry:retry}),'작업 상태 저장 실패');
}
export async function markJobCompleted(jobId:string):Promise<boolean>{return await finish(jobId)==='completed';}
export async function markJobFailed(jobId:string,code:string,message:string):Promise<boolean>{return await finish(jobId,code,message,false)==='failed';}
export async function markJobFailedOrRequeue(job:JobRow,code:string,message:string):Promise<'requeued'|'failed'|'lease-lost'>{
 return await finish(job.id,code,message) as 'requeued'|'failed'|'lease-lost';
}
export async function requeueStaleRunningJobs(_staleBefore:Date):Promise<number>{
 return unwrapRow<number>(await supabase.rpc('recover_localization_jobs',{p_stale_ms:env.JOB_STALE_AFTER_MS}),'작업 복구 실패');
}
export async function touchJobLease(jobId:string):Promise<boolean>{
 const task=currentTask();if(!task)return false;
 return unwrapRow<boolean>(await supabase.rpc('touch_localization_lease',{p_job:jobId,p_lease:task.leaseToken}),'작업 heartbeat 실패');
}
