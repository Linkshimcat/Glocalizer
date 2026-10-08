import { env } from '../config/env.js';
import { supabase } from '../config/supabase.js';
import type { ReadinessDependencies } from '../types/health.js';

/** API worker가 의존하는 Supabase DB와 private bucket 연결 상태를 확인한다. */
export async function checkServiceDependencies(): Promise<ReadinessDependencies> {
  const [databaseResult, storageResult] = await Promise.all([
    supabase.rpc('backend_schema_ready'),
    supabase.storage.getBucket(env.SUPABASE_STORAGE_BUCKET),
  ]);

  return {
    database: !databaseResult.error && databaseResult.data === true,
    storage: !storageResult.error && storageResult.data !== null && storageResult.data.public === false && storageResult.data.file_size_limit === env.MAX_FILE_SIZE_BYTES,
  };
}
