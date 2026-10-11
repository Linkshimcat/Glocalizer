-- A deletion reservation is durable and shares owner/project locks with queue admission.
create table public.deletion_tasks (
 id uuid primary key default gen_random_uuid(), kind text not null check(kind in ('project','generation','account')),
 target_id uuid not null, paths text[] not null default '{}', auth_user_id uuid,
 status text not null default 'pending' check(status in ('pending','running','done')),
 attempts integer not null default 0, next_attempt_at timestamptz not null default now(),
 lease_token uuid, heartbeat_at timestamptz, error text, created_at timestamptz not null default now(),
 unique(kind,target_id)
);
alter table public.deletion_tasks enable row level security;
revoke all on public.deletion_tasks from public,anon,authenticated;
grant all on public.deletion_tasks to service_role;
create index deletion_tasks_due_idx on deletion_tasks(next_attempt_at);

create function public.reserve_deletion(p_kind text,p_target uuid) returns uuid language plpgsql security invoker set search_path=public as $$
declare task_id uuid; owner uuid; project_ids uuid[]; generation_ids uuid[]; auth_id uuid; manifest text[];
begin
 if p_kind='account' then owner:=p_target;
 elsif p_kind='project' then select owner_id into owner from projects where id=p_target;
 elsif p_kind='generation' then select owner_id into owner from generation_projects where id=p_target;
 else raise exception 'INVALID_REQUEST'; end if;
 perform 1 from users where id=owner for update;
 select id into task_id from deletion_tasks where kind=p_kind and target_id=p_target;
 if found then return task_id; end if;
 if p_kind='account' then
  select supabase_auth_id into auth_id from users where id=p_target and deleting_at is null;
  if not found then raise exception 'NOT_FOUND'; end if;
  perform 1 from projects where owner_id=owner order by id for update;
  perform 1 from generation_projects where owner_id=owner order by id for update;
  select coalesce(array_agg(id),'{}') into project_ids from projects where owner_id=owner;
  select coalesce(array_agg(id),'{}') into generation_ids from generation_projects where owner_id=owner;
 elsif p_kind='project' then
  perform 1 from projects where id=p_target and deleting_at is null for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  project_ids:=array[p_target];generation_ids:='{}';
 else
  perform 1 from generation_projects where id=p_target and deleting_at is null for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  generation_ids:=array[p_target];project_ids:='{}';
 end if;
 if exists(select 1 from jobs where project_id=any(project_ids) and status in ('queued','running')) or
 exists(select 1 from generation_images where project_id=any(generation_ids) and status in ('queued','running')) then raise exception 'PROCESS_ALREADY_RUNNING'; end if;
 select coalesce(array_agg(distinct path) filter(where path is not null),'{}') into manifest from (
  select original_path path from assets where project_id=any(project_ids)
  union all select preprocessed_path from assets where project_id=any(project_ids)
  union all select cleaned_path from assets where project_id=any(project_ids)
  union all select path from job_artifacts where project_id=any(project_ids)
  union all select reference_path from generation_projects where id=any(generation_ids)
  union all select path from generation_images where project_id=any(generation_ids)
  union all select artifact_path from generation_images where project_id=any(generation_ids)
 ) files;
 -- Children are marked first: their write guards still see an active owner.
 update projects set deleting_at=now() where id=any(project_ids);
 update generation_projects set deleting_at=now() where id=any(generation_ids);
 if p_kind='account' then update users set deleting_at=now() where id=owner;end if;
 insert into deletion_tasks(kind,target_id,paths,auth_user_id) values(p_kind,p_target,manifest,auth_id) returning id into task_id;
 return task_id;
end $$;

create function public.claim_deletion(p_id uuid default null) returns jsonb language plpgsql security invoker set search_path=public as $$
declare t deletion_tasks;
begin
 select * into t from deletion_tasks where (p_id is null or id=p_id) and
 (status in ('pending','done') or (status='running' and heartbeat_at<now()-interval '2 minutes'))
 and (p_id is not null or next_attempt_at<=now()) order by next_attempt_at,id for update skip locked limit 1;
 if not found then return null;end if;
 update deletion_tasks set status='running',attempts=attempts+1,lease_token=gen_random_uuid(),heartbeat_at=now() where id=t.id returning * into t;
 return to_jsonb(t);
end $$;
create function public.touch_deletion(p_id uuid,p_lease uuid) returns boolean language plpgsql security invoker set search_path=public as $$
begin update deletion_tasks set heartbeat_at=now() where id=p_id and lease_token=p_lease and status='running';return found;end $$;
create function public.finish_deletion(p_id uuid,p_lease uuid,p_error text default null) returns boolean language plpgsql security invoker set search_path=public as $$
declare t deletion_tasks;
begin
 select * into t from deletion_tasks where id=p_id and lease_token=p_lease and status='running' for update;
 if not found then return false;end if;
 if p_error is not null then
  update deletion_tasks set status='pending',error=left(p_error,1000),next_attempt_at=now()+least(300,30*power(2,least(t.attempts-1,4))) * interval '1 second' where id=p_id;return true;
 end if;
 if t.kind='account' then delete from users where id=t.target_id;
 elsif t.kind='project' then delete from projects where id=t.target_id;
 else delete from generation_projects where id=t.target_id;end if;
 -- Retain the manifest and sweep again to remove a late storage upload from an expired worker.
 update deletion_tasks set status='done',error=null,next_attempt_at=now()+interval '5 minutes' where id=p_id;
 return true;
end $$;

-- Protect direct writes too. A reservation must block uploads, drafts, edits and queue writes.
create function public.guard_deleting_owner_project() returns trigger language plpgsql security invoker set search_path=public as $$
declare owner uuid; pid uuid; generation boolean:=false; deleting timestamptz;
begin
 if tg_table_name='users' then
  if old.deleting_at is not null then raise exception 'ACCOUNT_DELETING';end if;return new;
 elsif tg_table_name='projects' then owner:=new.owner_id;pid:=new.id;
 elsif tg_table_name='generation_projects' then owner:=new.owner_id;pid:=new.id;generation:=true;
 elsif tg_table_name in ('assets','jobs') then pid:=new.project_id;select owner_id into owner from projects where id=pid;
 elsif tg_table_name='generation_images' then pid:=new.project_id;generation:=true;select owner_id into owner from generation_projects where id=pid;
 elsif tg_table_name='ocr_regions' then select project_id into pid from assets where id=new.asset_id;select owner_id into owner from projects where id=pid;
 elsif tg_table_name='editor_states' then
  select project_id into pid from assets where id=new.asset_id;select owner_id into owner from projects where id=pid;
 elsif tg_table_name='translations' then
  select a.project_id into pid from assets a join ocr_regions r on r.asset_id=a.id where r.id=new.ocr_region_id;
  select owner_id into owner from projects where id=pid;
 end if;
 if owner is not null then
  select deleting_at into deleting from users where id=owner for update;
  if not found or deleting is not null then raise exception 'ACCOUNT_DELETING';end if;
 end if;
 if generation then select deleting_at into deleting from generation_projects where id=pid for update;
 else select deleting_at into deleting from projects where id=pid for update;end if;
 if deleting is not null then raise exception 'PROJECT_DELETING';end if;
 if tg_table_name='assets' and exists(select 1 from jobs where project_id=pid and status in ('queued','running')
  and id::text is distinct from current_setting('app.localization_job',true)) then raise exception 'PROCESS_ALREADY_RUNNING';end if;
 return new;
end $$;
create trigger guard_user_deletion before update on users for each row execute function guard_deleting_owner_project();
do $$ declare tab text;begin
 foreach tab in array array['projects','generation_projects','assets','jobs','generation_images','ocr_regions','translations','editor_states'] loop
  execute format('create trigger guard_project_deletion before insert or update on %I for each row execute function guard_deleting_owner_project()',tab);
 end loop;
end $$;

-- Generation admission uses the same owner lock before its existing budget/project locks.
do $$ declare f record; definition text;begin
 for f in select oid from pg_proc where pronamespace='public'::regnamespace and proname in ('enqueue_generation','enqueue_generation_batch','enqueue_generation_samples') loop
  definition:=pg_get_functiondef(f.oid);
  definition:=regexp_replace(definition,'(?i)begin', E'begin\n perform 1 from public.users where id=p_owner and deleting_at is null for update;\n if not found then raise exception ''NOT_FOUND''; end if;', '');
  execute definition;
 end loop;
end $$;

create function public.backend_schema_ready() returns boolean language sql security invoker set search_path=public as $$
 select (select bool_and(exists(select 1 from information_schema.columns c where c.table_schema='public' and c.table_name=required.tab and c.column_name=required.col))
 from (values ('users','session_version'),('users','deleting_at'),('projects','deleting_at'),('jobs','lease_token'),('jobs','asset_ids'),('jobs','initial_states'),('jobs','payload'),
 ('generation_images','lease_token'),('generation_images','heartbeat_at'),('generation_images','artifact_path'),('deletion_tasks','paths')) required(tab,col))
 and (select bool_and(case when to_regprocedure(signature) is null then false else has_function_privilege(current_user,to_regprocedure(signature),'EXECUTE') end)
 from unnest(array['public.enqueue_localization_job(uuid,text[],jsonb)','public.claim_localization_job(text)','public.recover_localization_jobs(integer)',
 'public.mutate_localization_job(uuid,uuid,text,uuid,jsonb)','public.touch_localization_lease(uuid,uuid)','public.finish_localization_job(uuid,uuid,text,text,boolean)',
 'public.claim_generation_job(text)','public.touch_generation_lease(uuid,uuid)','public.recover_generation_jobs(integer)','public.mutate_generation_job(uuid,uuid,jsonb)',
 'public.reserve_deletion(text,uuid)','public.claim_deletion(uuid)','public.touch_deletion(uuid,uuid)','public.finish_deletion(uuid,uuid,text)','public.orphan_artifact_paths()','public.mark_orphan_artifacts(text[])']) signature);

$$;
do $$ declare f regprocedure;begin
 for f in select oid::regprocedure from pg_proc where pronamespace='public'::regnamespace and proname in
 ('reserve_deletion','claim_deletion','touch_deletion','finish_deletion','guard_deleting_owner_project','backend_schema_ready') loop
  execute format('revoke all on function %s from public,anon,authenticated',f);
  execute format('grant execute on function %s to service_role',f);
 end loop;
end $$;

create function public.orphan_artifact_paths() returns text[] language sql security invoker set search_path=public as $$
 select coalesce(array_agg(path),'{}') from (
  select path from (
   select a.path,a.removed_at,a.created_at from job_artifacts a join jobs j on j.id=a.job_id
   where (j.status<>'running' or j.lease_token is distinct from a.lease_token)
   and not exists(select 1 from assets s where s.cleaned_path=a.path)
   union all select artifact_path,artifact_removed_at,created_at from generation_images where status='failed' and artifact_path is not null and path is null
  ) all_candidates order by removed_at nulls first,created_at,path limit 100
 ) candidates;
$$;
create function public.mark_orphan_artifacts(p_paths text[]) returns void language plpgsql security invoker set search_path=public as $$
begin
 update job_artifacts set removed_at=now() where path=any(p_paths);
 update generation_images set artifact_removed_at=now() where artifact_path=any(p_paths) and status='failed' and path is null;
end $$;
revoke all on function public.orphan_artifact_paths(), public.mark_orphan_artifacts(text[]) from public,anon,authenticated;
grant execute on function public.orphan_artifact_paths(), public.mark_orphan_artifacts(text[]) to service_role;
