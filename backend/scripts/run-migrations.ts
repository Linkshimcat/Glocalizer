import { createHash } from 'node:crypto';
import { setDefaultResultOrder } from 'node:dns';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import 'dotenv/config';
import pg from 'pg';

// npm scripts run from backend/, while compiled scripts live under backend/dist/scripts.
const MIGRATIONS_DIR = resolve(process.cwd(), '..', 'supabase', 'migrations');
const MIGRATION_TABLE = 'app.schema_migrations';

// WSL hosts frequently resolve Supabase pooler endpoints to an unreachable IPv6 address first.
setDefaultResultOrder('ipv4first');

interface Migration {
  filename: string;
  checksum: string;
  sql: string;
}

function readMigrations(): Migration[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((filename) => /^\d{3}_.+\.sql$/.test(filename) && !filename.startsWith('000_'))
    .sort()
    .map((filename) => {
      const sql = readFileSync(join(MIGRATIONS_DIR, filename), 'utf-8').trim();
      return { filename, sql, checksum: createHash('sha256').update(sql).digest('hex') };
    });
}

async function hasExistingInitialSchema(client: pg.PoolClient): Promise<boolean> {
  const result = await client.query<{ table_name: string }>(
    `select table_name from information_schema.tables
     where table_schema = 'public'
       and table_name = any($1::text[])`,
    [['projects', 'assets', 'ocr_regions', 'translations', 'jobs', 'editor_states']],
  );
  return result.rowCount === 6;
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL environment variable is required');

  const migrations = readMigrations();
  const pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  const client = await pool.connect();

  try {
    await client.query('begin');
    await client.query('create schema if not exists app');
    await client.query(`create table if not exists ${MIGRATION_TABLE} (
      filename text primary key,
      checksum text not null,
      applied_at timestamptz not null default now()
    )`);

    const applied = await client.query<{ filename: string; checksum: string }>(`select filename, checksum from ${MIGRATION_TABLE}`);
    if (applied.rowCount === 0 && await hasExistingInitialSchema(client)) {
      const baseline = migrations.filter((migration) => migration.filename < '009_');
      for (const migration of baseline) {
        await client.query(`insert into ${MIGRATION_TABLE} (filename, checksum) values ($1, $2)`, [migration.filename, migration.checksum]);
      }
      console.log(`Baselined ${baseline.length} existing migrations.`);
    }

    const recorded = new Map(
      (await client.query<{ filename: string; checksum: string }>(`select filename, checksum from ${MIGRATION_TABLE}`)).rows
        .map((row) => [row.filename, row.checksum]),
    );
    for (const migration of migrations) {
      const storedChecksum = recorded.get(migration.filename);
      if (storedChecksum) {
        if (storedChecksum !== migration.checksum) {
          throw new Error(`Migration checksum changed after application: ${migration.filename}`);
        }
        continue;
      }

      if (migration.sql) await client.query(migration.sql);
      await client.query(`insert into ${MIGRATION_TABLE} (filename, checksum) values ($1, $2)`, [migration.filename, migration.checksum]);
      console.log(`Applied ${migration.filename}`);
    }
    await client.query('commit');
    console.log('Database migrations are up to date.');
  } catch (error) {
    await client.query('rollback').catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown migration error';
  console.error(`Migration failed: ${message}`);
  process.exitCode = 1;
});
