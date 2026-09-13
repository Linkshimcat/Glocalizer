create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  password_hash text,
  naver_id text unique,
  name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_login_method_present check (email is not null or naver_id is not null)
);

create index if not exists users_email_idx on public.users (email) where email is not null;
create index if not exists users_naver_id_idx on public.users (naver_id) where naver_id is not null;

-- 다른 테이블과 동일하게 backend(service_role, RLS 우회)를 통해서만 접근한다.
alter table public.users enable row level security;
