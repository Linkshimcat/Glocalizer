-- 본선 대응: QA 리포트 저장, 분석 이벤트 수집, 프로젝트 단위 캐릭터 페르소나.
-- 계약은 docs/TeamWork/README.md 6장. 이 마이그레이션은 서버 기동 가드(backend_schema_ready)를 바꾸므로
-- 백엔드 배포 전에 운영 DB에 먼저 적용해야 한다.

-- 캐릭터 말투 프로필(성격·말투·나이·금지 표현). 비어 있으면 기존 번역 동작과 같다.
alter table public.projects
  add column if not exists persona jsonb;

-- 검사할 때마다 한 행씩 쌓는 불변 이력. findings는 QaFinding[] 그대로 저장하고, 카운트는 이미지별 최종 판정 기준이다.
create table public.qa_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  image_revision text not null,
  ruleset_version text not null,
  findings jsonb not null default '[]'::jsonb check (jsonb_typeof(findings) = 'array'),
  pass_count integer not null default 0 check (pass_count >= 0),
  review_count integer not null default 0 check (review_count >= 0),
  fail_count integer not null default 0 check (fail_count >= 0),
  inspected_at timestamptz not null default now()
);

create index qa_reports_project_inspected_idx on public.qa_reports(project_id, inspected_at desc);

-- 이미지·번역문·이메일·실명은 저장하지 않는다. 프로젝트가 지워져도 집계가 흔들리지 않게 project_id만 비운다.
create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null check (event_name in (
    'demo_started', 'localization_started', 'localization_completed', 'qa_reviewed', 'export_succeeded', 'export_failed'
  )),
  client_event_id uuid not null unique,
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  anonymous_session_id text not null check (char_length(anonymous_session_id) between 8 and 64),
  project_id uuid references public.projects(id) on delete set null,
  experiment_group text not null check (experiment_group in ('internal', 'external', 'demo')),
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  image_count integer check (image_count is null or image_count between 0 and 1000)
);

create index analytics_events_group_name_time_idx on public.analytics_events(experiment_group, event_name, occurred_at);

-- 두 테이블 모두 백엔드(service_role)만 읽고 쓴다.
alter table public.qa_reports enable row level security;
revoke all on public.qa_reports from public, anon, authenticated;
grant all on public.qa_reports to service_role;

alter table public.analytics_events enable row level security;
revoke all on public.analytics_events from public, anon, authenticated;
grant all on public.analytics_events to service_role;

-- 새 테이블·컬럼이 없으면 서버가 기동하지 않도록 스키마 가드에 추가한다. 함수 전체를 다시 정의하므로 앞선 검사를 지우지 않게 이전 정의를 그대로 옮겼다.
create or replace function public.backend_schema_ready() returns boolean language sql security invoker set search_path=public as $$
 select (select bool_and(exists(select 1 from information_schema.columns c where c.table_schema='public' and c.table_name=required.tab and c.column_name=required.col))
 from (values ('users','session_version'),('users','deleting_at'),('users','membership_plan'),('users','kakao_id'),('users','security_email_notifications'),('users','security_email_new_device'),('users','security_email_password_changed'),('users','security_email_sessions_revoked'),('projects','deleting_at'),('projects','persona'),('jobs','lease_token'),('jobs','asset_ids'),('jobs','initial_states'),('jobs','payload'),
 ('generation_images','lease_token'),('generation_images','heartbeat_at'),('generation_images','artifact_path'),('deletion_tasks','paths'),
 ('user_sessions','revoked_at'),('user_sessions','expires_at'),('user_known_devices','device_id'),('payments','status'),('payments','confirmation_started_at'),
 ('qa_reports','findings'),('analytics_events','client_event_id')) required(tab,col))
 and (select bool_and(case when to_regprocedure(signature) is null then false else has_function_privilege(current_user,to_regprocedure(signature),'EXECUTE') end)
 from unnest(array['public.enqueue_localization_job(uuid,text[],jsonb)','public.claim_localization_job(text)','public.recover_localization_jobs(integer)',
 'public.mutate_localization_job(uuid,uuid,text,uuid,jsonb)','public.touch_localization_lease(uuid,uuid)','public.finish_localization_job(uuid,uuid,text,text,boolean)',
 'public.claim_generation_job(text)','public.touch_generation_lease(uuid,uuid)','public.recover_generation_jobs(integer)','public.mutate_generation_job(uuid,uuid,jsonb)',
 'public.reserve_deletion(text,uuid)','public.claim_deletion(uuid)','public.touch_deletion(uuid,uuid)','public.finish_deletion(uuid,uuid,text)','public.orphan_artifact_paths()','public.mark_orphan_artifacts(text[])',
 'public.claim_payment_confirmation(text,uuid,integer,text)','public.finalize_payment_and_membership(text,uuid,text,text,jsonb,timestamp with time zone)','public.fail_payment_confirmation(text,text,jsonb)']) signature);
$$;
