import { env } from '../config/env.js';
import { supabase } from '../config/supabase.js';

export async function downloadFromStorage(path: string): Promise<Buffer | null> {
  const { data, error } = await supabase.storage.from(env.SUPABASE_STORAGE_BUCKET).download(path);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}
