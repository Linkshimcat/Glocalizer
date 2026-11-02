-- Proof/Replay용 단계별 처리 시간. localization_completed 이벤트에만 {"recognizing":ms,"translating":ms,"cleaning":ms}를 담는다.
-- 이미지·번역문·이메일은 들어가지 않는다(숫자뿐). 백엔드가 이 컬럼을 읽으므로 백엔드 배포 전에 운영 DB에 먼저 적용해야 한다.
alter table public.analytics_events
  add column if not exists stage_durations jsonb
  check (stage_durations is null or jsonb_typeof(stage_durations) = 'object');

-- 새 컬럼이 없으면 서버가 기동하지 않도록 스키마 가드에 추가한다. 함수 전체를 다시 정의하므로 앞선 검사를 지우지 않게 20261029010000의 정의를 그대로 옮기고 한 줄만 더했다.
create or replace function public.backend_schema_ready() returns boolean language sql security invoker set search_path=public as $$
 select (select bool_and(exists(select 1 from information_schema.columns c where c.table_schema='public' and c.table_name=required.tab and c.column_name=required.col))
 from (values ('users','session_version'),('users','deleting_at'),('users','membership_plan'),('users','kakao_id'),('users','security_email_notifications'),('users','security_email_new_device'),('users','security_email_password_changed'),('users','security_email_sessions_revoked'),('projects','deleting_at'),('projects','persona'),('jobs','lease_token'),('jobs','asset_ids'),('jobs','initial_states'),('jobs','payload'),
 ('generation_images','lease_token'),('generation_images','heartbeat_at'),('generation_images','artifact_path'),('deletion_tasks','paths'),
 ('user_sessions','revoked_at'),('user_sessions','expires_at'),('user_known_devices','device_id'),('payments','status'),('payments','confirmation_started_at'),
 ('qa_reports','findings'),('analytics_events','client_event_id'),('analytics_events','stage_durations')) required(tab,col))
 and (select bool_and(case when to_regprocedure(signature) is null then false else has_function_privilege(current_user,to_regprocedure(signature),'EXECUTE') end)
 from unnest(array['public.enqueue_localization_job(uuid,text[],jsonb)','public.claim_localization_job(text)','public.recover_localization_jobs(integer)',
 'public.mutate_localization_job(uuid,uuid,text,uuid,jsonb)','public.touch_localization_lease(uuid,uuid)','public.finish_localization_job(uuid,uuid,text,text,boolean)',
 'public.claim_generation_job(text)','public.touch_generation_lease(uuid,uuid)','public.recover_generation_jobs(integer)','public.mutate_generation_job(uuid,uuid,jsonb)',
 'public.reserve_deletion(text,uuid)','public.claim_deletion(uuid)','public.touch_deletion(uuid,uuid)','public.finish_deletion(uuid,uuid,text)','public.orphan_artifact_paths()','public.mark_orphan_artifacts(text[])',
 'public.claim_payment_confirmation(text,uuid,integer,text)','public.finalize_payment_and_membership(text,uuid,text,text,jsonb,timestamp with time zone)','public.fail_payment_confirmation(text,text,jsonb)']) signature);
$$;
