create table public.landing_showcases (
  id uuid primary key default gen_random_uuid(),
  source_kind text not null check (source_kind in ('localization', 'generation')),
  source_project_id uuid not null,
  source_item_id uuid not null,
  language_code text,
  rights_basis text not null check (rights_basis in ('team_owned', 'licensed')),
  rights_confirmed_at timestamptz not null,
  original_path text not null check (original_path like 'landing-showcase/%'),
  result_path text not null check (result_path like 'landing-showcase/%'),
  sort_order integer not null default 0,
  approved_at timestamptz,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  constraint landing_showcases_language_check check (
    (source_kind = 'localization' and language_code is not null)
    or (source_kind = 'generation' and language_code is null)
  ),
  constraint landing_showcases_publication_check check (
    not published or (rights_confirmed_at is not null and approved_at is not null)
  )
);

create index landing_showcases_public_order_idx
  on public.landing_showcases(sort_order, created_at)
  where published;

alter table public.landing_showcases enable row level security;
revoke all on public.landing_showcases from anon, authenticated;
grant all on public.landing_showcases to service_role;

create function public.validate_landing_showcase_source()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.published then
    if new.source_kind = 'localization' and not exists (
      select 1
      from public.projects project
      join public.assets asset on asset.project_id = project.id
      where project.id = new.source_project_id
        and project.status = 'completed'
        and asset.id = new.source_item_id
        and asset.status = 'completed'
    ) then
      raise exception 'SHOWCASE_SOURCE_NOT_COMPLETED';
    end if;

    if new.source_kind = 'generation' and not exists (
      select 1
      from public.generation_projects project
      join public.generation_images image on image.project_id = project.id
      where project.id = new.source_project_id
        and project.status = 'completed'
        and image.id = new.source_item_id
        and image.status = 'completed'
    ) then
      raise exception 'SHOWCASE_SOURCE_NOT_COMPLETED';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.validate_landing_showcase_source() from public, anon, authenticated;

create trigger landing_showcases_validate_source
  before insert or update of source_kind, source_project_id, source_item_id, published
  on public.landing_showcases
  for each row execute function public.validate_landing_showcase_source();
