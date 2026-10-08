-- Additive job fencing; deploy after draining the old workers.
alter table public.users add column if not exists deleting_at timestamptz;
alter table public.projects add column if not exists deleting_at timestamptz;
alter table public.generation_projects add column if not exists deleting_at timestamptz;
alter table public.jobs add column if not exists lease_token uuid;
alter table public.jobs add column if not exists asset_ids uuid[] not null default '{}';
alter table public.jobs add column if not exists initial_states jsonb not null default '{}';
alter table public.jobs add column if not exists payload jsonb not null default '{}';
alter table public.generation_images add column if not exists lease_token uuid;
alter table public.generation_images add column if not exists worker_id text;
alter table public.generation_images add column if not exists heartbeat_at timestamptz;
alter table public.generation_images add column if not exists artifact_path text;
alter table public.generation_images add column if not exists artifact_removed_at timestamptz;

create table public.job_artifacts (
 path text primary key, project_id uuid not null references public.projects(id) on delete cascade,
 job_id uuid not null references public.jobs(id) on delete cascade, lease_token uuid not null,
 created_at timestamptz not null default now(), removed_at timestamptz
);
alter table public.job_artifacts enable row level security;
revoke all on public.job_artifacts from public, anon, authenticated;
grant all on public.job_artifacts to service_role;

create function public.enqueue_localization_job(p_project uuid, p_statuses text[], p_payload jsonb default '{}') returns jsonb
language plpgsql security invoker set search_path=public as $$
declare p projects; j jobs; ids uuid[]; states jsonb;
begin
 -- Owner then project is also the deletion lock order.
 perform 1 from users where id=(select owner_id from projects where id=p_project) and deleting_at is null for update;
 select * into p from projects where id=p_project and deleting_at is null for update;
 if not found or (p.owner_id is not null and not exists(select 1 from users where id=p.owner_id and deleting_at is null)) then raise exception 'PROJECT_NOT_FOUND'; end if;
 if exists(select 1 from jobs where project_id=p_project and status in ('queued','running')) then raise exception 'PROCESS_ALREADY_RUNNING'; end if;
 if p.owner_id is not null and p.status='created' and (coalesce(array_length(p.target_languages,1),0)=0 or coalesce(array_length(p.selected_client_ids,1),0)=0 or
   (select count(*) from assets where project_id=p_project and client_id=any(p.selected_client_ids) and status='uploaded')<>array_length(p.selected_client_ids,1)) then raise exception 'UPLOAD_NOT_COMPLETED'; end if;
 select array_agg(id),jsonb_object_agg(id::text,case when p_payload->>'operation' in ('revise','create') then 'ocr' when p_payload->>'operation'='retry' then case when exists(select 1 from ocr_regions r where r.asset_id=assets.id and r.contains_korean) then 'ocr' else 'uploaded' end else status end)
 into ids,states from assets where project_id=p_project
 and (case when p_payload ? 'assetId' then id=(p_payload->>'assetId')::uuid else status=any(p_statuses) end)
 and (p.owner_id is null or p.selected_client_ids is null or client_id=any(p.selected_client_ids));
 if ids is null then raise exception 'UPLOAD_NOT_COMPLETED'; end if;
 if p_payload->>'operation'='retry' and exists(select 1 from assets where id=any(ids) and status<>'failed') then raise exception 'INVALID_REQUEST';end if;
 if p.status='created' and p.owner_id is not null then
  update assets set status='pending_upload' where project_id=p_project and not(client_id=any(p.selected_client_ids));
 end if;
 insert into jobs(project_id,status,attempts,asset_ids,initial_states,payload) values(p_project,'queued',0,ids,states,p_payload) returning * into j;
 update projects set status='processing',stage='queued',progress=0,result_ready=false,error_code=null,error_message=null where id=p_project;
 return to_jsonb(j);
end $$;

create function public.claim_localization_job(p_worker text) returns jsonb language plpgsql security invoker set search_path=public as $$
declare j jobs;
begin
 select * into j from jobs where status='queued' order by created_at,id for update skip locked limit 1;
 if not found then return null; end if;
 if j.asset_ids='{}' then
  select coalesce(array_agg(id),'{}'),coalesce(jsonb_object_agg(id::text,case when status in ('ocr','translating') or exists(select 1 from ocr_regions r where r.asset_id=assets.id and r.contains_korean) then 'ocr' else 'uploaded' end),'{}')
  into j.asset_ids,j.initial_states from assets where project_id=j.project_id and status<>'completed' and status<>'pending_upload';
  update jobs set asset_ids=j.asset_ids,initial_states=j.initial_states where id=j.id;
  perform reset_localization_assets(j.id);
 end if;
 update jobs set status='running',attempts=attempts+1,lease_token=gen_random_uuid(),worker_id=p_worker,heartbeat_at=now(),locked_at=now(),started_at=now(),
  asset_ids=j.asset_ids,initial_states=j.initial_states where id=j.id returning * into j;
 return to_jsonb(j);
end $$;

create function public.reset_localization_assets(p_job uuid) returns void language plpgsql security invoker set search_path=public as $$
declare j jobs;
begin
 select * into j from jobs where id=p_job;
 perform set_config('app.localization_job',j.id::text,true);
 update assets set status=coalesce(j.initial_states->>id::text,'uploaded'),stage='retrying',progress=0,error_code=null,error_message=null,cleaned_path=null
 where project_id=j.project_id and id=any(j.asset_ids) and status<>'completed';
end $$;

create function public.recover_localization_jobs(p_stale_ms integer) returns integer language plpgsql security invoker set search_path=public as $$
declare j jobs; n integer:=0;
begin
 for j in select * from jobs where status='running' and coalesce(heartbeat_at,locked_at,started_at,created_at)<now()-p_stale_ms*interval '1 millisecond' for update skip locked loop
  if j.asset_ids='{}' then
   select coalesce(array_agg(id),'{}'),coalesce(jsonb_object_agg(id::text,case when status in ('ocr','translating') or exists(select 1 from ocr_regions r where r.asset_id=assets.id and r.contains_korean) then 'ocr' else 'uploaded' end),'{}')
    into j.asset_ids,j.initial_states from assets where project_id=j.project_id and status not in ('completed','pending_upload');
   update jobs set asset_ids=j.asset_ids,initial_states=j.initial_states where id=j.id;
  end if;
  if j.attempts<j.max_attempts then
   perform reset_localization_assets(j.id);
   update jobs set status='queued',lease_token=null,worker_id=null,heartbeat_at=null,locked_at=null,error_code='WORKER_LEASE_EXPIRED' where id=j.id;
  else
   update jobs set status='failed',completed_at=now(),error_code='WORKER_LEASE_EXPIRED',error_message='작업 복구 횟수를 초과했습니다.' where id=j.id;
   update assets set status='failed',error_code='WORKER_LEASE_EXPIRED',error_message='작업 복구 횟수를 초과했습니다.' where id=any(j.asset_ids) and status<>'completed';
   update projects set status='failed',error_code='WORKER_LEASE_EXPIRED',error_message='작업 복구 횟수를 초과했습니다.' where id=j.project_id;
  end if;
  n:=n+1;
 end loop;
 return n;
end $$;

create function public.touch_localization_lease(p_job uuid,p_lease uuid) returns boolean language plpgsql security invoker set search_path=public as $$
begin
 update jobs set heartbeat_at=now() where id=p_job and lease_token=p_lease and status='running';
 return found;
end $$;

create function public.finish_localization_job(p_job uuid,p_lease uuid,p_error_code text default null,p_error_message text default null,p_retry boolean default true) returns text
language plpgsql security invoker set search_path=public as $$
declare j jobs;
begin
 select * into j from jobs where id=p_job and lease_token=p_lease and status='running' for update;
 if not found then return 'lease-lost'; end if;
 if p_error_code is null then
  update jobs set status='completed',progress=100,completed_at=now() where id=p_job;return 'completed';
 elsif p_retry and j.attempts<j.max_attempts then
  perform reset_localization_assets(p_job);
  update jobs set status='queued',lease_token=null,worker_id=null,heartbeat_at=null,locked_at=null,error_code=p_error_code,error_message=p_error_message where id=p_job;return 'requeued';
 else
  update jobs set status='failed',completed_at=now(),error_code=p_error_code,error_message=p_error_message where id=p_job;
  update projects set status='failed',error_code=p_error_code,error_message=p_error_message where id=j.project_id;
  return 'failed';
 end if;
end $$;

-- Whitelisted mutation types; all writes share the locked current lease.
create function public.mutate_localization_job(p_job uuid,p_lease uuid,p_operation text,p_target uuid,p_data jsonb) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare j jobs; a assets; p projects; r ocr_regions; t translations;
begin
 select * into j from jobs where id=p_job and lease_token=p_lease and status='running' for update;
 if not found then return null; end if;
 perform set_config('app.localization_job',j.id::text,true);
 if p_operation='project' then
  if p_target<>j.project_id then raise exception 'INVALID_TARGET'; end if;
  select * into p from projects where id=p_target;
  p:=jsonb_populate_record(p,p_data);
  update projects set status=p.status,stage=p.stage,progress=p.progress,result_ready=case when p.status='processing' then false else p.result_ready end,
   error_code=p.error_code,error_message=p.error_message,updated_at=now() where id=p_target;
  return '{}'::jsonb;
 end if;
 if p_operation in ('asset','ocr_replace','ocr_insert','artifact') then
  select * into a from assets where id=p_target and project_id=j.project_id and id=any(j.asset_ids);
 else
  select * into r from ocr_regions where id=p_target;
  select * into a from assets where id=r.asset_id and project_id=j.project_id and id=any(j.asset_ids);
 end if;
 if a.id is null then raise exception 'INVALID_TARGET'; end if;
 case p_operation
 when 'asset' then
  a:=jsonb_populate_record(a,p_data);
  update assets set status=a.status,stage=a.stage,progress=a.progress,width=a.width,height=a.height,has_alpha=a.has_alpha,cleaned_path=a.cleaned_path,
   cleanup_method=a.cleanup_method,cleanup_quality=a.cleanup_quality,needs_manual_cleanup=a.needs_manual_cleanup,text_color=a.text_color,
   error_code=a.error_code,error_message=a.error_message,updated_at=now() where id=p_target;
 when 'ocr_replace' then
  delete from ocr_regions where asset_id=p_target;
  for r in select * from jsonb_populate_recordset(null::ocr_regions,p_data) loop
   r.asset_id:=p_target;r.created_at:=now();r.needs_manual_cleanup:=coalesce(r.needs_manual_cleanup,false);insert into ocr_regions select (r).*;
  end loop;
 when 'ocr_insert' then
  r:=jsonb_populate_record(null::ocr_regions,p_data);r.asset_id:=p_target;r.created_at:=now();r.needs_manual_cleanup:=coalesce(r.needs_manual_cleanup,false);
  insert into ocr_regions select (r).* on conflict(id) do nothing;
  select * into r from ocr_regions where id=r.id and asset_id=p_target;
  if not found then raise exception 'INVALID_TARGET'; end if;
  return to_jsonb(r);
 when 'ocr_patch' then
  r:=jsonb_populate_record(r,p_data);
  update ocr_regions set detected_text=r.detected_text,bbox=r.bbox,normalized_bbox=r.normalized_bbox,polygon=r.polygon,
   source=r.source,agreement_score=r.agreement_score,needs_manual_review=r.needs_manual_review,font_style=r.font_style,
   text_color=r.text_color,needs_manual_cleanup=r.needs_manual_cleanup where id=p_target;
  return to_jsonb(r);
 when 'translation' then
  t:=jsonb_populate_record(null::translations,p_data);
  if t.ocr_region_id<>p_target then raise exception 'INVALID_TARGET'; end if;
  insert into translations(ocr_region_id,language_code,generation_candidates,final_candidates,recommended_style,generation_model,prompt_version)
   values(t.ocr_region_id,t.language_code,t.generation_candidates,t.final_candidates,t.recommended_style,t.generation_model,t.prompt_version)
   on conflict(ocr_region_id,language_code) do update set generation_candidates=excluded.generation_candidates,final_candidates=excluded.final_candidates,
    recommended_style=excluded.recommended_style,generation_model=excluded.generation_model,prompt_version=excluded.prompt_version;
 when 'translation_delete' then delete from translations where ocr_region_id=p_target;
 when 'artifact' then
  if p_data->>'path'<>format('projects/%s/cleaned/%s/%s/%s.png',j.project_id,j.id,j.lease_token,p_target) then raise exception 'INVALID_PATH'; end if;
  insert into job_artifacts(path,project_id,job_id,lease_token) values(p_data->>'path',j.project_id,j.id,j.lease_token) on conflict do nothing;
 else raise exception 'INVALID_OPERATION';
 end case;
 return '{}'::jsonb;
end $$;

create function public.claim_generation_job(p_worker text) returns jsonb language plpgsql security invoker set search_path=public as $$
declare g generation_images;
begin
 select * into g from generation_images where status='queued' order by created_at,id for update skip locked limit 1;
 if not found then return null; end if;
 update generation_images set status='running',lease_token=gen_random_uuid(),worker_id=p_worker,heartbeat_at=now(),started_at=now() where id=g.id returning * into g;
 return to_jsonb(g);
end $$;
create function public.touch_generation_lease(p_job uuid,p_lease uuid) returns boolean language plpgsql security invoker set search_path=public as $$
begin
 update generation_images set heartbeat_at=now() where id=p_job and lease_token=p_lease and status='running';return found;
end $$;
create function public.recover_generation_jobs(p_stale_ms integer) returns integer language plpgsql security invoker set search_path=public as $$
declare n integer;
begin
 update generation_images set status='failed',error='처리가 중단됐습니다. 비용이 발생했을 수 있어 자동 재시도하지 않습니다.'
 where status='running' and coalesce(heartbeat_at,started_at,created_at)<now()-p_stale_ms*interval '1 millisecond';
 get diagnostics n=row_count;return n;
end $$;
create function public.mutate_generation_job(p_job uuid,p_lease uuid,p_data jsonb) returns boolean language plpgsql security invoker set search_path=public as $$
begin
 -- A late paid response may still record usage, but may never publish a result after recovery.
 if p_data ? 'usage' then
  update generation_images set usage=p_data->'usage',cost_usd=(p_data->>'cost_usd')::numeric where id=p_job and lease_token=p_lease;return found;
 end if;
 update generation_images set status=coalesce(p_data->>'status',status),path=coalesce(p_data->>'path',path),artifact_path=coalesce(p_data->>'artifact_path',artifact_path),
  caption_style=coalesce(p_data->'caption_style',caption_style),elapsed_ms=coalesce((p_data->>'elapsed_ms')::integer,elapsed_ms),error=p_data->>'error'
 where id=p_job and lease_token=p_lease and status='running';return found;
end $$;

do $$ declare f regprocedure; begin
 for f in select oid::regprocedure from pg_proc where pronamespace='public'::regnamespace and proname in
 ('enqueue_localization_job','claim_localization_job','reset_localization_assets','recover_localization_jobs','touch_localization_lease','finish_localization_job','mutate_localization_job',
  'claim_generation_job','touch_generation_lease','recover_generation_jobs','mutate_generation_job') loop
  execute format('revoke all on function %s from public, anon, authenticated',f);
  execute format('grant execute on function %s to service_role',f);
 end loop;
end $$;
