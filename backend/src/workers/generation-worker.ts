import { env } from '../config/env.js';
import { runtime } from '../config/runtime.js';
import { supabase } from '../config/supabase.js';
import { logger } from '../config/logger.js';
import { processGenerationImage, type GenerationImage } from '../services/generation.service.js';
import { unwrapNullableRow, unwrapRow } from '../utils/db-result.js';
import { withTask } from '../utils/task-context.js';
import { startHeartbeat } from '../utils/heartbeat.js';
let stopped = true;
let activeLoops: Promise<void>[] = [];
export function startGenerationWorker() {
  if (activeLoops.length || !env.ENABLE_IMAGE_GENERATION || !env.OPENAI_API_KEY) return;
  stopped = false;
  activeLoops = Array.from({ length: 2 }, () => loop());
  void Promise.all(activeLoops).finally(() => { activeLoops = []; });
}
export async function stopGenerationWorker() {
  stopped = true;
  await Promise.all(activeLoops);
}
async function loop() {
  while (!stopped) {
    try {
      unwrapRow<number>(await supabase.rpc('recover_generation_jobs', { p_stale_ms: env.JOB_STALE_AFTER_MS }), '중단된 생성 복구 실패');
      if (stopped) break;
      const job = unwrapNullableRow<GenerationImage>(await supabase.rpc('claim_generation_job', { p_worker: runtime.workerId }), '생성 큐 점유 실패');
      if (job?.lease_token) {
        const controller = new AbortController();
        await withTask({ kind: 'generation', id: job.id, projectId: job.project_id, leaseToken: job.lease_token, controller }, async () => {
          const stopHeartbeat = startHeartbeat(async () => unwrapRow<boolean>(await supabase.rpc('touch_generation_lease', { p_job: job.id, p_lease: job.lease_token }), '생성 heartbeat 실패'), controller, job.id);
          try { await processGenerationImage(job); } finally { stopHeartbeat(); }
        });
        continue;
      }
    } catch (err) { logger.error({ err }, 'Generation worker failed'); }
    if (!stopped) await new Promise(resolve => setTimeout(resolve, env.WORKER_POLL_INTERVAL_MS));
  }
}
