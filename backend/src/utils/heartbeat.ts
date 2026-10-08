import { logger } from '../config/logger.js';
import { env } from '../config/env.js';
import { LeaseLostError } from '../repositories/job-mutation.js';
/** Serial pulses cannot pile up behind a slow DB. Failed pulses never extend the local lease. */
export function startHeartbeat(touch:()=>Promise<boolean>,controller:AbortController,id:string):()=>void {
 let stopped=false,lastSuccess=Date.now(),timer:NodeJS.Timeout|undefined;
 const expiry = setTimeout(() => controller.abort(new LeaseLostError()), env.JOB_STALE_AFTER_MS);
 expiry.unref();
 const pulse=async()=>{
  if(stopped||controller.signal.aborted)return;
  try {
   if(!await touch()){controller.abort(new LeaseLostError());return;}
   lastSuccess=Date.now();
   expiry.refresh();
  } catch(err){
   logger.warn({err,jobId:id},'Job heartbeat failed');
   if(Date.now()-lastSuccess>=env.JOB_STALE_AFTER_MS){controller.abort(new LeaseLostError());return;}
  }
  if(!stopped&&!controller.signal.aborted){timer=setTimeout(()=>{void pulse();},env.JOB_HEARTBEAT_INTERVAL_MS);timer.unref();}
 };
 timer=setTimeout(()=>{void pulse();},env.JOB_HEARTBEAT_INTERVAL_MS);timer.unref();
 return ()=>{stopped=true;clearTimeout(expiry);if(timer)clearTimeout(timer);};
}
