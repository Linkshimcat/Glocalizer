alter table jobs
  add column if not exists worker_id text,
  add column if not exists heartbeat_at timestamptz;

update jobs
set heartbeat_at = coalesce(locked_at, started_at, created_at)
where status = 'running' and heartbeat_at is null;

create index if not exists jobs_running_heartbeat_idx
  on jobs (status, heartbeat_at)
  where status = 'running';
