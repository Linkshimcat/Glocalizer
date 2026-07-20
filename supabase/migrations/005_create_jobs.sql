create table jobs (
  id uuid primary key default gen_random_uuid(),

  project_id uuid not null
    references projects(id)
    on delete cascade,

  status text not null default 'queued',
  stage text,
  progress integer not null default 0,

  attempts integer not null default 0,
  max_attempts integer not null default 2,

  locked_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,

  error_code text,
  error_message text,

  created_at timestamptz not null default now()
);

create index jobs_project_id_idx on jobs (project_id);
create index jobs_status_idx on jobs (status);
