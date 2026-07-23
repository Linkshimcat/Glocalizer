import { env } from '../src/config/env.js';
import { supabase } from '../src/config/supabase.js';

const TABLES = ['projects', 'assets', 'ocr_regions', 'translations', 'jobs', 'editor_states'] as const;

async function main(): Promise<void> {
  const tableStatuses = await Promise.all(
    TABLES.map(async (table) => {
      const { error } = await supabase.from(table).select('id', { head: true, count: 'exact' }).limit(1);
      return { table, error };
    }),
  );

  const failedTables = tableStatuses.filter((result) => result.error);
  const { data: bucket, error: bucketError } = await supabase.storage.getBucket(env.SUPABASE_STORAGE_BUCKET);
  if (failedTables.length > 0 || bucketError || !bucket) {
    const failedNames = failedTables.map((result) => result.table).join(', ');
    throw new Error(`Supabase check failed${failedNames ? ` for tables: ${failedNames}` : ''}${bucketError ? ' (storage bucket unavailable)' : ''}`);
  }

  console.log(`Supabase OK: ${TABLES.length} tables and private bucket "${env.SUPABASE_STORAGE_BUCKET}" are reachable.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Supabase check failed');
  process.exitCode = 1;
});
