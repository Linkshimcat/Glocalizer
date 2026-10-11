import { retryPendingDeletions } from '../services/deletion.service.js';
import { supabase } from '../config/supabase.js';
import { removeFromStorage } from '../repositories/storage.repository.js';
import { unwrapRow, unwrapVoid } from '../utils/db-result.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { runExpiredProjectsCleanup } from './cleanup-expired.job.js';

let active: Promise<void> | null = null;
let intervalHandle: NodeJS.Timeout | null = null;

export function startExpiredProjectsSweep(): void {
  if (intervalHandle) return;
  let lastExpirySweep = 0;
  const sweep = async () => {
    try {
      // Recovery also runs when paid generation admission is disabled.
      unwrapRow<number>(await supabase.rpc('recover_generation_jobs', { p_stale_ms: env.JOB_STALE_AFTER_MS }), '중단된 생성 복구 실패');
      await retryPendingDeletions();
      const orphans = unwrapRow<string[]>(await supabase.rpc('orphan_artifact_paths'), '미사용 파일 조회 실패');
      await removeFromStorage(orphans);
      if (orphans.length) unwrapVoid(await supabase.rpc('mark_orphan_artifacts', { p_paths: orphans }), '미사용 파일 정리 기록 실패');
      if (Date.now() - lastExpirySweep < env.CLEANUP_SWEEP_INTERVAL_MS) return;
      lastExpirySweep = Date.now();
      const deletedCount = await runExpiredProjectsCleanup();
      if (deletedCount > 0) {
        logger.info({ deletedCount }, '만료 프로젝트 정리 완료');
      }
    } catch (err) {
      logger.error({ err }, '만료 프로젝트 정리 중 오류');
    }
  };

  const run = () => {
    if (!active) active = sweep().finally(() => { active = null; });
  };
  run();
  intervalHandle = setInterval(run, 30_000);
}

export async function stopExpiredProjectsSweep(): Promise<void> {
  if (intervalHandle) clearInterval(intervalHandle);
  intervalHandle = null;
  if (active) await active;
}
