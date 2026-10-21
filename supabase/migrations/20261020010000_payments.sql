-- 멤버십 결제(TossPayments). 1회성 결제로 1개월 멤버십을 부여한다(정기결제 미구현).
-- amount는 백엔드 PLANS 레지스트리가 유일한 소스이며, 여기 저장된 값은 Toss confirm 호출 시
-- 변조 여부를 검증하는 데 쓰인다(클라이언트가 보낸 금액을 그대로 신뢰하지 않는다).
create table public.payments (
 id uuid primary key default gen_random_uuid(),
 order_id text unique not null,
 user_id uuid not null references public.users(id) on delete cascade,
 plan_id text not null,
 amount integer not null,
 status text not null default 'pending' check (status in ('pending','done','failed','canceled')),
 method text,
 toss_payment_key text,
 approved_at timestamptz,
 raw_response jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.payments enable row level security;
revoke all on public.payments from public,anon,authenticated;
grant all on public.payments to service_role;
create index payments_user_idx on public.payments(user_id, created_at desc);

alter table public.users add column membership_plan text;
alter table public.users add column membership_expires_at timestamptz;

-- 새 테이블/컬럼이 없으면 서버가 기동하지 않도록 스키마 가드에 추가한다(PR #140 때처럼 마이그레이션 누락을 배포 단계에서 잡는다).
create or replace function public.backend_schema_ready() returns boolean language sql security invoker set search_path=public as $$
 select (select bool_and(exists(select 1 from information_schema.columns c where c.table_schema='public' and c.table_name=required.tab and c.column_name=required.col))
 from (values ('users','session_version'),('users','deleting_at'),('users','membership_plan'),('projects','deleting_at'),('jobs','lease_token'),('jobs','asset_ids'),('jobs','initial_states'),('jobs','payload'),
 ('generation_images','lease_token'),('generation_images','heartbeat_at'),('generation_images','artifact_path'),('deletion_tasks','paths'),
 ('user_sessions','revoked_at'),('user_sessions','expires_at'),('payments','status')) required(tab,col))
 and (select bool_and(case when to_regprocedure(signature) is null then false else has_function_privilege(current_user,to_regprocedure(signature),'EXECUTE') end)
 from unnest(array['public.enqueue_localization_job(uuid,text[],jsonb)','public.claim_localization_job(text)','public.recover_localization_jobs(integer)',
 'public.mutate_localization_job(uuid,uuid,text,uuid,jsonb)','public.touch_localization_lease(uuid,uuid)','public.finish_localization_job(uuid,uuid,text,text,boolean)',
 'public.claim_generation_job(text)','public.touch_generation_lease(uuid,uuid)','public.recover_generation_jobs(integer)','public.mutate_generation_job(uuid,uuid,jsonb)',
 'public.reserve_deletion(text,uuid)','public.claim_deletion(uuid)','public.touch_deletion(uuid,uuid)','public.finish_deletion(uuid,uuid,text)','public.orphan_artifact_paths()','public.mark_orphan_artifacts(text[])']) signature);

$$;
