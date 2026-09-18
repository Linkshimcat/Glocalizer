alter table public.projects
  add column owner_id uuid references public.users(id) on delete cascade,
  add column selected_client_ids text[],
  add column result_ready boolean not null default false;
alter table public.projects alter column expires_at drop not null;
create index projects_owner_updated_idx on public.projects(owner_id, updated_at desc) where owner_id is not null;
-- Existing anonymous projects retain their expiry. Owned projects never expire.
alter table public.projects add constraint projects_owned_no_expiry check (owner_id is null or expires_at is null);
-- Access remains backend-only via service_role; do not add public read policies.
alter table public.projects enable row level security;
