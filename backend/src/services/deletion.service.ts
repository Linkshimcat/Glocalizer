import { supabase } from '../config/supabase.js';
import { AppError } from '../errors/app-error.js';
import { removeFromStorage } from '../repositories/storage.repository.js';
import { unwrapNullableRow, unwrapRow, unwrapVoid } from '../utils/db-result.js';
import { withTask, taskSignal, withoutTask } from '../utils/task-context.js';
import { startHeartbeat } from '../utils/heartbeat.js';
import { logger } from '../config/logger.js';
interface DeletionTask { id: string; target_id: string; paths: string[]; auth_user_id: string | null; lease_token: string }
async function processDeletion(task: DeletionTask): Promise<void> {
  const controller = new AbortController();
  await withTask({ kind: 'deletion', id: task.id, projectId: task.target_id, leaseToken: task.lease_token, controller }, async () => {
    const stop = startHeartbeat(async () => unwrapRow<boolean>(await supabase.rpc('touch_deletion', {p_id: task.id, p_lease: task.lease_token}), '삭제 heartbeat 실패'), controller, task.id);
    try {
      await removeFromStorage(task.paths);
      if (task.auth_user_id) {
        const { error } = await supabase.auth.admin.deleteUser(task.auth_user_id);
        if (error && error.status !== 404 && error.code !== 'user_not_found') throw new AppError('INTERNAL_ERROR', undefined, '연동 계정 삭제에 실패했습니다.');
      }
      taskSignal().throwIfAborted();
      if (!unwrapRow<boolean>(await supabase.rpc('finish_deletion', {p_id: task.id, p_lease: task.lease_token}), '삭제 완료 처리 실패')) throw new Error('Deletion lease lost');
    } catch (error) {
      // Keep the immutable manifest even after partial storage deletion.
      await withoutTask(async () => unwrapVoid(await supabase.rpc('finish_deletion', {p_id: task.id, p_lease: task.lease_token, p_error: error instanceof Error ? error.message : '삭제 실패'}), '삭제 재시도 저장 실패')).catch(err => logger.error({err, taskId: task.id}, '삭제 재시도 저장 실패'));
      throw error;
    } finally { stop(); }
  });
}
export async function deleteDurably(kind: 'project' | 'generation' | 'account', target: string): Promise<void> {
  const result = await supabase.rpc('reserve_deletion', {p_kind: kind, p_target: target});
  if (result.error?.message.includes('PROCESS_ALREADY_RUNNING')) throw new AppError('PROCESS_ALREADY_RUNNING');
  if (result.error?.message.includes('NOT_FOUND')) throw new AppError(kind === 'project' ? 'PROJECT_NOT_FOUND' : 'NOT_FOUND');
  const id = unwrapRow<string>(result, '삭제 예약 실패');
  const task = unwrapNullableRow<DeletionTask>(await supabase.rpc('claim_deletion', {p_id: id}), '삭제 예약 조회 실패');
  if (!task) throw new AppError('INTERNAL_ERROR', undefined, '삭제 작업이 진행 중입니다. 잠시 후 다시 확인해주세요.');
  await processDeletion(task);
}
export async function retryPendingDeletions(): Promise<void> {
  for (let i = 0; i < 10; i++) {
    const task = unwrapNullableRow<DeletionTask>(await supabase.rpc('claim_deletion'), '삭제 재시도 조회 실패');
    if (!task) return;
    try { await processDeletion(task); } catch (err) { logger.warn({err, taskId: task.id}, '삭제 실패; 다음 시도 예정'); }
  }
}
