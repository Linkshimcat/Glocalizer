create table assets (
  id uuid primary key default gen_random_uuid(),

  project_id uuid not null
    references projects(id)
    on delete cascade,

  client_id text,
  original_name text not null,
  mime_type text not null,
  byte_size bigint not null,

  width integer,
  height integer,
  has_alpha boolean,

  original_path text,
  preprocessed_path text,
  cleaned_path text,

  status text not null default 'pending_upload',
  stage text,
  progress integer not null default 0,

  cleanup_method text,
  cleanup_quality text,
  needs_manual_cleanup boolean not null default false,

  error_code text,
  error_message text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index assets_project_id_idx on assets (project_id);
