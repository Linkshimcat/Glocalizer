import { env } from '../config/env.js';
import { supabase } from '../config/supabase.js';
import { logger } from '../config/logger.js';
import { processGenerationImage, type GenerationImage } from '../services/generation.service.js';
import { unwrapNullableRow, unwrapVoid } from '../utils/db-result.js';
let stopped=true;
let active:Promise<void>|null=null;
export function startGenerationWorker() {
 if(!env.ENABLE_IMAGE_GENERATION||!env.OPENAI_API_KEY) return;
 stopped=false;void loop();
}
export async function stopGenerationWorker() { stopped=true;if(active) await active; }
async function loop() {
 while(!stopped) {
  try {
   // Never retry uncertain paid requests automatically after a crash.
   unwrapVoid(await supabase.from('generation_images').update({status:'failed',error:'처리가 중단됐습니다. 비용이 발생했을 수 있어 자동 재시도하지 않습니다.'}).eq('status','running').lt('started_at',new Date(Date.now()-600_000).toISOString()),'중단된 생성 복구 실패');
   const job=unwrapNullableRow<GenerationImage>(await supabase.from('generation_images').select().eq('status','queued').order('created_at').limit(1).maybeSingle(),'생성 큐 조회 실패');
   if(job&&!stopped) {
    const claimed=unwrapNullableRow<GenerationImage>(await supabase.from('generation_images').update({status:'running',started_at:new Date().toISOString()}).eq('id',job.id).eq('status','queued').select().maybeSingle(),'생성 큐 점유 실패');
    if(claimed) { active=processGenerationImage(claimed);await active;active=null;continue; }
   }
  } catch(err) {logger.error({err},'Generation worker failed');}
  await new Promise(resolve=>setTimeout(resolve,2000));
 }
}
