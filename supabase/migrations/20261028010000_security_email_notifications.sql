alter table public.users
  add column if not exists security_email_notifications boolean not null default true;

-- 브라우저 프로필별 무작위 UUID만 보관한다. 원본 User-Agent나 IP는 이 테이블에 저장하지 않는다.
create table public.user_known_devices (
  user_id uuid not null references public.users(id) on delete cascade,
  device_id uuid not null,
  first_seen_at timestamptz not null default now(),
  primary key (user_id, device_id)
);

alter table public.user_known_devices enable row level security;
revoke all on public.user_known_devices from public, anon, authenticated;
grant all on public.user_known_devices to service_role;

create or replace function public.backend_schema_ready() returns boolean language sql security invoker set search_path=public as $$
 select (select bool_and(exists(select 1 from information_schema.columns c where c.table_schema='public' and c.table_name=required.tab and c.column_name=required.col))
 from (values ('users','session_version'),('users','deleting_at'),('users','membership_plan'),('users','kakao_id'),('users','security_email_notifications'),('projects','deleting_at'),('jobs','lease_token'),('jobs','asset_ids'),('jobs','initial_states'),('jobs','payload'),
 ('generation_images','lease_token'),('generation_images','heartbeat_at'),('generation_images','artifact_path'),('deletion_tasks','paths'),
 ('user_sessions','revoked_at'),('user_sessions','expires_at'),('user_known_devices','device_id'),('payments','status'),('payments','confirmation_started_at')) required(tab,col))
 and (select bool_and(case when to_regprocedure(signature) is null then false else has_function_privilege(current_user,to_regprocedure(signature),'EXECUTE') end)
 from unnest(array['public.enqueue_localization_job(uuid,text[],jsonb)','public.claim_localization_job(text)','public.recover_localization_jobs(integer)',
 'public.mutate_localization_job(uuid,uuid,text,uuid,jsonb)','public.touch_localization_lease(uuid,uuid)','public.finish_localization_job(uuid,uuid,text,text,boolean)',
 'public.claim_generation_job(text)','public.touch_generation_lease(uuid,uuid)','public.recover_generation_jobs(integer)','public.mutate_generation_job(uuid,uuid,jsonb)',
 'public.reserve_deletion(text,uuid)','public.claim_deletion(uuid)','public.touch_deletion(uuid,uuid)','public.finish_deletion(uuid,uuid,text)','public.orphan_artifact_paths()','public.mark_orphan_artifacts(text[])',
 'public.claim_payment_confirmation(text,uuid,integer,text)','public.finalize_payment_and_membership(text,uuid,text,text,jsonb,timestamp with time zone)','public.fail_payment_confirmation(text,text,jsonb)']) signature);
$$;
