-- REVIEW H-03: 재시도 횟수를 다 쓴 작업이 최종 실패할 때 이미지 상태도 failed로 정리한다.
-- 기존 정의(20261008020000_job_fencing.sql)는 jobs·projects만 failed로 바꾸고 assets는 그대로 둬서,
-- 이미지가 preprocessing/ocr/translating에 영구히 남았다(단건 재시도는 failed만 받고, 새 작업은 INVALID_TARGET으로 실패).
-- recover_localization_jobs의 최종 실패 분기와 같은 방식으로, 이 작업의 미완료 이미지만 failed로 바꾼다.
-- 나머지 분기(완료·재시도)는 기존과 같다.
create or replace function public.finish_localization_job(p_job uuid,p_lease uuid,p_error_code text default null,p_error_message text default null,p_retry boolean default true) returns text
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
  update assets set status='failed',error_code=p_error_code,error_message=p_error_message where project_id=j.project_id and id=any(j.asset_ids) and status<>'completed';
  update projects set status='failed',error_code=p_error_code,error_message=p_error_message where id=j.project_id;
  return 'failed';
 end if;
end $$;

revoke all on function public.finish_localization_job(uuid,uuid,text,text,boolean) from public, anon, authenticated;
grant execute on function public.finish_localization_job(uuid,uuid,text,text,boolean) to service_role;
