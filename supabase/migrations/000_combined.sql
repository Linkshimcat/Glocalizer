-- 001_create_projects.sql
create extension if not exists pgcrypto;

create table projects (
  id uuid primary key default gen_random_uuid(),

  access_token_hash text not null,

  status text not null default 'created',
  stage text,
  progress integer not null default 0,

  target_languages text[] not null,
  localization_options jsonb not null default '{}',

  error_code text,
  error_message text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index projects_expires_at_idx on projects (expires_at);

-- 002_create_assets.sql
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

-- 003_create_ocr_regions.sql
create table ocr_regions (
  id uuid primary key default gen_random_uuid(),

  asset_id uuid not null
    references assets(id)
    on delete cascade,

  detected_text text not null,
  confidence real not null,

  bbox jsonb not null,
  normalized_bbox jsonb,
  polygon jsonb,

  contains_korean boolean not null default false,
  is_primary boolean not null default false,
  reading_order integer not null default 0,

  created_at timestamptz not null default now()
);

create index ocr_regions_asset_id_idx on ocr_regions (asset_id);

-- 004_create_translations.sql
create table translations (
  id uuid primary key default gen_random_uuid(),

  ocr_region_id uuid not null
    references ocr_regions(id)
    on delete cascade,

  language_code text not null,

  glm_candidates jsonb not null,
  review_result jsonb,
  final_candidates jsonb not null,

  recommended_style jsonb,

  generation_model text not null,
  review_model text,
  prompt_version text not null,

  created_at timestamptz not null default now(),

  unique (ocr_region_id, language_code)
);

-- 005_create_jobs.sql
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

-- 006_create_editor_states.sql
create table editor_states (
  id uuid primary key default gen_random_uuid(),

  asset_id uuid not null
    references assets(id)
    on delete cascade,

  ocr_region_id uuid
    references ocr_regions(id)
    on delete cascade,

  language_code text not null,
  style jsonb not null,

  updated_at timestamptz not null default now(),

  unique (asset_id, ocr_region_id, language_code)
);

-- 007_enable_rls.sql
alter table projects enable row level security;
alter table assets enable row level security;
alter table ocr_regions enable row level security;
alter table translations enable row level security;
alter table jobs enable row level security;
alter table editor_states enable row level security;

-- 008_add_regenerate_count.sql
alter table translations add column regenerate_count integer not null default 0;
