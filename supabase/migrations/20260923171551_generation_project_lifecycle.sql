alter table public.generation_projects
  add column status text not null default 'active'
    check (status in ('active', 'completed')),
  add column completed_at timestamptz,
  add column plan jsonb not null default '[]'::jsonb;

-- 기존 데이터는 사용자별 최신 프로젝트만 이어서 작업하고, 나머지는 보관함으로 옮긴다.
with ranked as (
  select id, row_number() over (partition by owner_id order by created_at desc, id desc) as position
  from public.generation_projects
)
update public.generation_projects as project
set status = 'completed', completed_at = coalesce(project.completed_at, now())
from ranked
where project.id = ranked.id and ranked.position > 1;

alter table public.generation_projects
  drop constraint if exists generation_projects_owner_id_day_key;

create unique index generation_projects_one_active_per_owner
  on public.generation_projects(owner_id)
  where status = 'active';

alter table public.generation_images
  drop constraint if exists generation_images_slot_check;
alter table public.generation_images
  add constraint generation_images_slot_check check (slot between 0 and 23);

create or replace function public.enqueue_generation(
  p_owner uuid,
  p_project uuid,
  p_slot integer,
  p_prompt text,
  p_reserve numeric,
  p_budget numeric
)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  v_project generation_projects;
  v_id uuid;
  v_count integer;
  v_daily_spend numeric;
begin
  perform pg_advisory_xact_lock(7130921);
  select * into v_project
  from generation_projects
  where id = p_project and owner_id = p_owner
  for update;

  if not found then raise exception 'NOT_FOUND'; end if;
  if v_project.status <> 'active' then raise exception 'COMPLETED'; end if;
  if p_slot < 0 or p_slot > 23 then raise exception 'INVALID_SLOT'; end if;
  if p_slot <> 0 and not v_project.confirmed then raise exception 'NOT_CONFIRMED'; end if;
  if p_slot = 0 and v_project.confirmed then raise exception 'CONFIRMED'; end if;
  if exists (
    select 1 from generation_images
    where project_id = p_project and slot = p_slot and status in ('queued', 'running')
  ) then raise exception 'RUNNING'; end if;

  select count(*) into v_count
  from generation_images
  where project_id = p_project;
  if v_count >= 30 then raise exception 'LIMIT'; end if;

  -- 24개 최초 생성 외 재생성은 프로젝트당 최대 6회다.
  if exists (
    select 1 from generation_images where project_id = p_project and slot = p_slot
  ) and (
    select count(*) - count(distinct slot)
    from generation_images
    where project_id = p_project
  ) >= 6 then raise exception 'LIMIT'; end if;

  -- 프로젝트 생성일과 무관하게 사용자별 한국 날짜의 실제 비용과 예약 비용만 합산한다.
  select coalesce(sum(coalesce(image.cost_usd, image.reserve_usd)), 0)
  into v_daily_spend
  from generation_images as image
  join generation_projects as project on project.id = image.project_id
  where project.owner_id = p_owner
    and (image.created_at at time zone 'Asia/Seoul')::date = (now() at time zone 'Asia/Seoul')::date;

  if v_daily_spend + p_reserve > p_budget then raise exception 'LIMIT'; end if;

  insert into generation_images(project_id, slot, prompt, reserve_usd, caption)
  values (
    p_project,
    p_slot,
    p_prompt,
    p_reserve,
    coalesce((
      select caption from generation_images
      where project_id = p_project and slot = p_slot and status = 'completed'
      order by created_at desc limit 1
    ), '')
  )
  returning id into v_id;
  return v_id;
end $$;

revoke all on function public.enqueue_generation(uuid,uuid,integer,text,numeric,numeric) from public,anon,authenticated;
grant execute on function public.enqueue_generation(uuid,uuid,integer,text,numeric,numeric) to service_role;

create or replace function public.enqueue_generation_batch(
  p_owner uuid,
  p_project uuid,
  p_slots integer[],
  p_prompts text[],
  p_reserve numeric,
  p_budget numeric
)
returns void language plpgsql security invoker set search_path = public as $$
declare
  v_index integer;
begin
  if array_length(p_slots, 1) is null
    or array_length(p_slots, 1) <> array_length(p_prompts, 1)
    or array_length(p_slots, 1) > 4
  then raise exception 'INVALID'; end if;
  if cardinality(p_slots) <> (select count(distinct value) from unnest(p_slots) as slots(value))
  then raise exception 'INVALID'; end if;

  for v_index in 1..array_length(p_slots, 1) loop
    perform public.enqueue_generation(
      p_owner,
      p_project,
      p_slots[v_index],
      p_prompts[v_index],
      p_reserve,
      p_budget
    );
  end loop;
end $$;

revoke all on function public.enqueue_generation_batch(uuid,uuid,integer[],text[],numeric,numeric) from public,anon,authenticated;
grant execute on function public.enqueue_generation_batch(uuid,uuid,integer[],text[],numeric,numeric) to service_role;

create or replace function public.enqueue_generation_samples(
  p_owner uuid,
  p_project uuid,
  p_prompts text[],
  p_reserve numeric,
  p_budget numeric
)
returns void language plpgsql security invoker set search_path = public as $$
begin
  if array_length(p_prompts, 1) <> 3 then raise exception 'INVALID'; end if;
  perform public.enqueue_generation_batch(
    p_owner,
    p_project,
    array[1, 2, 3],
    p_prompts,
    p_reserve,
    p_budget
  );
end $$;

revoke all on function public.enqueue_generation_samples(uuid,uuid,text[],numeric,numeric) from public,anon,authenticated;
grant execute on function public.enqueue_generation_samples(uuid,uuid,text[],numeric,numeric) to service_role;

create function public.complete_generation(p_owner uuid, p_project uuid)
returns void language plpgsql security invoker set search_path = public as $$
declare
  v_completed_slots integer;
begin
  perform 1 from generation_projects
  where id = p_project and owner_id = p_owner and status = 'active'
  for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if exists (
    select 1 from generation_images
    where project_id = p_project and status in ('queued', 'running')
  ) then raise exception 'RUNNING'; end if;

  select count(distinct slot) into v_completed_slots
  from generation_images
  where project_id = p_project and status = 'completed';
  if v_completed_slots <> 24 then raise exception 'INCOMPLETE'; end if;

  update generation_projects
  set status = 'completed', completed_at = now()
  where id = p_project;
end $$;

revoke all on function public.complete_generation(uuid,uuid) from public,anon,authenticated;
grant execute on function public.complete_generation(uuid,uuid) to service_role;
