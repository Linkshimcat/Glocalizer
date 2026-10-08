alter table public.users add column if not exists session_version integer not null default 0 check (session_version >= 0);
