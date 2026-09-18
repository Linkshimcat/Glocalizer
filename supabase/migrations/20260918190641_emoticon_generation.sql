create table public.generation_projects (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.users(id) on delete cascade,
 prompt text not null, reference_path text, confirmed boolean not null default false,
 created_at timestamptz not null default now(), day date not null default ((now() at time zone 'Asia/Seoul')::date),
 unique(owner_id, day)
);
create table public.generation_images (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.generation_projects(id) on delete cascade,
 slot integer not null check(slot between 0 and 3), prompt text not null,
 status text not null default 'queued' check(status in ('queued','running','completed','failed')),
 path text, caption text not null default '', error text, cost_usd numeric, reserve_usd numeric not null,
 usage jsonb, elapsed_ms integer, created_at timestamptz not null default now(), started_at timestamptz
);
create index generation_images_queue on public.generation_images(created_at) where status = 'queued';
create unique index generation_images_active on public.generation_images(project_id,slot) where status in ('queued','running');
alter table public.generation_projects enable row level security;
alter table public.generation_images enable row level security;
-- Custom JWT is checked by the backend. No browser/Data API grants or policies.
revoke all on public.generation_projects, public.generation_images from anon, authenticated;
grant all on public.generation_projects, public.generation_images to service_role;
-- A single transaction serializes budget and quota reservations across instances.
create function public.enqueue_generation(p_owner uuid,p_project uuid,p_slot integer,p_prompt text,p_reserve numeric,p_budget numeric)
returns uuid language plpgsql security invoker set search_path = public as $$
declare v_project generation_projects; v_id uuid; v_count integer;
begin
 perform pg_advisory_xact_lock(7130921);
 select * into v_project from generation_projects where id=p_project and owner_id=p_owner for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if v_project.day <> (now() at time zone 'Asia/Seoul')::date then raise exception 'LIMIT'; end if;
 if p_slot <> 0 and not v_project.confirmed then raise exception 'NOT_CONFIRMED'; end if;
 if p_slot = 0 and v_project.confirmed then raise exception 'CONFIRMED'; end if;
 if exists(select 1 from generation_images where project_id=p_project and slot=p_slot and status in ('queued','running')) then raise exception 'RUNNING'; end if;
 select count(*) into v_count from generation_images where project_id=p_project;
 if v_count >= 6 then raise exception 'LIMIT'; end if;
 -- Four initial calls; at most two additional attempts, failures included.
 if exists(select 1 from generation_images where project_id=p_project and slot=p_slot)
 and (select count(*) - count(distinct slot) from generation_images where project_id=p_project) >= 2 then raise exception 'LIMIT'; end if;
 if (select coalesce(sum(coalesce(cost_usd,reserve_usd)),0) from generation_images)+p_reserve > p_budget then raise exception 'LIMIT'; end if;
 insert into generation_images(project_id,slot,prompt,reserve_usd,caption) values(p_project,p_slot,p_prompt,p_reserve,coalesce((select caption from generation_images where project_id=p_project and slot=p_slot and status='completed' order by created_at desc limit 1),'')) returning id into v_id;
 return v_id;
end $$;
revoke all on function public.enqueue_generation(uuid,uuid,integer,text,numeric,numeric) from public,anon,authenticated;
grant execute on function public.enqueue_generation(uuid,uuid,integer,text,numeric,numeric) to service_role;

create function public.enqueue_generation_samples(p_owner uuid,p_project uuid,p_prompts text[],p_reserve numeric,p_budget numeric)
returns void language plpgsql security invoker set search_path = public as $$
begin
 if array_length(p_prompts,1) <> 3 then raise exception 'INVALID'; end if;
 perform public.enqueue_generation(p_owner,p_project,1,p_prompts[1],p_reserve,p_budget);
 perform public.enqueue_generation(p_owner,p_project,2,p_prompts[2],p_reserve,p_budget);
 perform public.enqueue_generation(p_owner,p_project,3,p_prompts[3],p_reserve,p_budget);
end $$;
revoke all on function public.enqueue_generation_samples(uuid,uuid,text[],numeric,numeric) from public,anon,authenticated;
grant execute on function public.enqueue_generation_samples(uuid,uuid,text[],numeric,numeric) to service_role;

create function public.confirm_generation(p_owner uuid,p_project uuid)
returns void language plpgsql security invoker set search_path = public as $$
begin
 perform 1 from generation_projects where id=p_project and owner_id=p_owner for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if exists(select 1 from generation_images where project_id=p_project and status in ('queued','running')) then raise exception 'RUNNING'; end if;
 if not exists(select 1 from generation_images where project_id=p_project and slot=0 and status='completed') then raise exception 'INVALID'; end if;
 update generation_projects set confirmed=true where id=p_project;
end $$;
revoke all on function public.confirm_generation(uuid,uuid) from public,anon,authenticated;
grant execute on function public.confirm_generation(uuid,uuid) to service_role;
