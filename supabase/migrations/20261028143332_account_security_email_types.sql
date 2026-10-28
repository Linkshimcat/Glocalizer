-- 설정 페이지: 보안 이메일을 종류별로 끈다. 기존 전체 토글(security_email_notifications)이 꺼져 있으면 종류와 관계없이 보내지 않는다.
alter table public.users
  add column if not exists security_email_new_device boolean not null default true,
  add column if not exists security_email_password_changed boolean not null default true,
  add column if not exists security_email_sessions_revoked boolean not null default true;

-- 로그인 기록은 user_sessions 행(폐기·만료 후에도 삭제하지 않음)을 최근순으로 읽는다. 폐기된 행까지 훑으므로 전용 인덱스를 둔다.
create index if not exists user_sessions_user_created_idx on public.user_sessions(user_id, created_at desc);

-- 새 컬럼이 없으면 서버가 기동하지 않도록 스키마 가드에 추가한다.
create or replace function public.backend_schema_ready() returns boolean language sql security invoker set search_path=public as $$
 select (select bool_and(exists(select 1 from information_schema.columns c where c.table_schema='public' and c.table_name=required.tab and c.column_name=required.col))
 from (values ('users','session_version'),('users','deleting_at'),('users','membership_plan'),('users','kakao_id'),('users','security_email_notifications'),('users','security_email_new_device'),('users','security_email_password_changed'),('users','security_email_sessions_revoked'),('projects','deleting_at'),('jobs','lease_token'),('jobs','asset_ids'),('jobs','initial_states'),('jobs','payload'),
 ('generation_images','lease_token'),('generation_images','heartbeat_at'),('generation_images','artifact_path'),('deletion_tasks','paths'),
 ('user_sessions','revoked_at'),('user_sessions','expires_at'),('user_known_devices','device_id'),('payments','status'),('payments','confirmation_started_at')) required(tab,col))
 and (select bool_and(case when to_regprocedure(signature) is null then false else has_function_privilege(current_user,to_regprocedure(signature),'EXECUTE') end)
 from unnest(array['public.enqueue_localization_job(uuid,text[],jsonb)','public.claim_localization_job(text)','public.recover_localization_jobs(integer)',
 'public.mutate_localization_job(uuid,uuid,text,uuid,jsonb)','public.touch_localization_lease(uuid,uuid)','public.finish_localization_job(uuid,uuid,text,text,boolean)',
 'public.claim_generation_job(text)','public.touch_generation_lease(uuid,uuid)','public.recover_generation_jobs(integer)','public.mutate_generation_job(uuid,uuid,jsonb)',
 'public.reserve_deletion(text,uuid)','public.claim_deletion(uuid)','public.touch_deletion(uuid,uuid)','public.finish_deletion(uuid,uuid,text)','public.orphan_artifact_paths()','public.mark_orphan_artifacts(text[])',
 'public.claim_payment_confirmation(text,uuid,integer,text)','public.finalize_payment_and_membership(text,uuid,text,text,jsonb,timestamp with time zone)','public.fail_payment_confirmation(text,text,jsonb)']) signature);
$$;
