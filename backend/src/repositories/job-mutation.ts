import { currentTask, throwIfTaskCancelled } from '../utils/task-context.js';
import { unwrapNullableRow } from '../utils/db-result.js';
export class LeaseLostError extends Error {
  constructor() { super('Job lease lost'); this.name='LeaseLostError'; }
}
/** Null means this is an ordinary request; a worker write always uses the fenced RPC. */
export async function jobMutation<T=unknown>(operation:string,target:string,data:unknown):Promise<{value:T}|null> {
 const context=currentTask();if(context?.kind!=='localization') return null;
 throwIfTaskCancelled();
 const { supabase } = await import('../config/supabase.js');
 const result=await supabase.rpc('mutate_localization_job',{p_job:context.id,p_lease:context.leaseToken,p_operation:operation,p_target:target,p_data:data});
 const value=unwrapNullableRow<T>(result,'작업 결과 저장 실패');
 if(value===null) {const error=new LeaseLostError();context.controller.abort(error);throw error;}
 return {value};
}
