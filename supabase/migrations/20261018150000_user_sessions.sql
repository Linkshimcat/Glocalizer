-- 기기별 로그인 세션. 토큰의 sid 클레임이 이 행을 가리키고, revoked_at/expires_at으로 개별 로그아웃을 지원한다.
-- users.session_version은 그대로 "전체 폐기"(비밀번호 변경, 다른 기기 모두 로그아웃)에 쓴다.
create table public.user_sessions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.users(id) on delete cascade,
 login_method text not null check (login_method in ('email','naver','google')),
 user_agent text check (user_agent is null or char_length(user_agent) <= 255),
 device_label text check (device_label is null or char_length(device_label) <= 80),
 ip_masked text check (ip_masked is null or char_length(ip_masked) <= 64),
 created_at timestamptz not null default now(),
 last_seen_at timestamptz not null default now(),
 expires_at timestamptz not null,
 revoked_at timestamptz
);
alter table public.user_sessions enable row level security;
revoke all on public.user_sessions from public,anon,authenticated;
grant all on public.user_sessions to service_role;
create index user_sessions_user_active_idx on public.user_sessions(user_id, last_seen_at desc) where revoked_at is null;

-- 새 테이블이 없으면 서버가 기동하지 않도록 스키마 가드에 추가한다(PR #140 때처럼 마이그레이션 누락을 배포 단계에서 잡는다).
create or replace function public.backend_schema_ready() returns boolean language sql security invoker set search_path=public as $$
 select (select bool_and(exists(select 1 from information_schema.columns c where c.table_schema='public' and c.table_name=required.tab and c.column_name=required.col))
 from (values ('users','session_version'),('users','deleting_at'),('projects','deleting_at'),('jobs','lease_token'),('jobs','asset_ids'),('jobs','initial_states'),('jobs','payload'),
 ('generation_images','lease_token'),('generation_images','heartbeat_at'),('generation_images','artifact_path'),('deletion_tasks','paths'),
 ('user_sessions','revoked_at'),('user_sessions','expires_at')) required(tab,col))
 and (select bool_and(case when to_regprocedure(signature) is null then false else has_function_privilege(current_user,to_regprocedure(signature),'EXECUTE') end)
 from unnest(array['public.enqueue_localization_job(uuid,text[],jsonb)','public.claim_localization_job(text)','public.recover_localization_jobs(integer)',
 'public.mutate_localization_job(uuid,uuid,text,uuid,jsonb)','public.touch_localization_lease(uuid,uuid)','public.finish_localization_job(uuid,uuid,text,text,boolean)',
 'public.claim_generation_job(text)','public.touch_generation_lease(uuid,uuid)','public.recover_generation_jobs(integer)','public.mutate_generation_job(uuid,uuid,jsonb)',
 'public.reserve_deletion(text,uuid)','public.claim_deletion(uuid)','public.touch_deletion(uuid,uuid)','public.finish_deletion(uuid,uuid,text)','public.orphan_artifact_paths()','public.mark_orphan_artifacts(text[])']) signature);

$$;
