import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';
import { logger } from './logger.js';

export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export async function ensureStorageBucket(): Promise<void> {
  const { data: existing, error: getError } = await supabase.storage.getBucket(env.SUPABASE_STORAGE_BUCKET);

  if (existing) return;

  if (getError && !/not found/i.test(getError.message)) {
    logger.warn({ err: getError }, 'Could not check storage bucket existence');
  }

  const { error: createError } = await supabase.storage.createBucket(env.SUPABASE_STORAGE_BUCKET, {
    public: false,
  });

  if (createError && !/already exists/i.test(createError.message)) {
    logger.warn({ err: createError }, 'Could not create storage bucket automatically; create it manually in Supabase');
    return;
  }

  logger.info({ bucket: env.SUPABASE_STORAGE_BUCKET }, 'Storage bucket ready');
}
