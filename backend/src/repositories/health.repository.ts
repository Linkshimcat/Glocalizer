import { env } from '../config/env.js';
import { supabase } from '../config/supabase.js';
import type { ReadinessDependencies } from '../types/health.js';

/** API worker가 의존하는 Supabase DB와 private bucket 연결 상태를 확인한다. */
export async function checkServiceDependencies(): Promise<ReadinessDependencies> {
  const [databaseResult, storageResult] = await Promise.all([
    supabase.from('jobs').select('id', { head: true, count: 'exact' }).limit(1),
    supabase.storage.getBucket(env.SUPABASE_STORAGE_BUCKET),
  ]);

  return {
    database: !databaseResult.error,
    storage: !storageResult.error && storageResult.data !== null,
  };
}
