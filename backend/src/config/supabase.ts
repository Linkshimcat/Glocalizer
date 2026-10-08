import { taskFetch } from '../utils/task-context.js';
import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';
import { logger } from './logger.js';

export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  global: { fetch: taskFetch },
  auth: { persistSession: false, autoRefreshToken: false },
});

export async function ensureStorageBucket(): Promise<void> {
  const { data: existing, error: getError } = await supabase.storage.getBucket(env.SUPABASE_STORAGE_BUCKET);

  const options = { public: false, fileSizeLimit: env.MAX_FILE_SIZE_BYTES };
  if (getError && !/not found/i.test(getError.message)) throw new Error('Storage bucket lookup failed');
  const { error } = existing
    ? await supabase.storage.updateBucket(env.SUPABASE_STORAGE_BUCKET, options)
    : await supabase.storage.createBucket(env.SUPABASE_STORAGE_BUCKET, options);
  if (error) throw new Error('Storage bucket configuration failed');
  logger.info({ bucket: env.SUPABASE_STORAGE_BUCKET }, 'Storage bucket ready');
}
