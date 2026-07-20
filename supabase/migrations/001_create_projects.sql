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
