-- 카카오 로그인. naver_id와 동일한 패턴 — 미설정 시 로그인 API만 503, 나머지는 정상 동작(env.ts 참고).
alter table public.users add column kakao_id text unique;
create index users_kakao_id_idx on public.users (kakao_id) where kakao_id is not null;

alter table public.users drop constraint users_login_method_present;
alter table public.users add constraint users_login_method_present check (email is not null or naver_id is not null or kakao_id is not null);

-- 새 컬럼이 없으면 서버가 기동하지 않도록 스키마 가드에 추가한다(PR #140 때처럼 마이그레이션 누락을 배포 단계에서 잡는다).
create or replace function public.backend_schema_ready() returns boolean language sql security invoker set search_path=public as $$
 select (select bool_and(exists(select 1 from information_schema.columns c where c.table_schema='public' and c.table_name=required.tab and c.column_name=required.col))
 from (values ('users','session_version'),('users','deleting_at'),('users','membership_plan'),('users','kakao_id'),('projects','deleting_at'),('jobs','lease_token'),('jobs','asset_ids'),('jobs','initial_states'),('jobs','payload'),
 ('generation_images','lease_token'),('generation_images','heartbeat_at'),('generation_images','artifact_path'),('deletion_tasks','paths'),
 ('user_sessions','revoked_at'),('user_sessions','expires_at'),('payments','status')) required(tab,col))
 and (select bool_and(case when to_regprocedure(signature) is null then false else has_function_privilege(current_user,to_regprocedure(signature),'EXECUTE') end)
 from unnest(array['public.enqueue_localization_job(uuid,text[],jsonb)','public.claim_localization_job(text)','public.recover_localization_jobs(integer)',
 'public.mutate_localization_job(uuid,uuid,text,uuid,jsonb)','public.touch_localization_lease(uuid,uuid)','public.finish_localization_job(uuid,uuid,text,text,boolean)',
 'public.claim_generation_job(text)','public.touch_generation_lease(uuid,uuid)','public.recover_generation_jobs(integer)','public.mutate_generation_job(uuid,uuid,jsonb)',
 'public.reserve_deletion(text,uuid)','public.claim_deletion(uuid)','public.touch_deletion(uuid,uuid)','public.finish_deletion(uuid,uuid,text)','public.orphan_artifact_paths()','public.mark_orphan_artifacts(text[])']) signature);

$$;
