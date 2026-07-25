-- API의 사전 조회만으로는 동시에 들어온 process 요청을 완전히 직렬화할 수 없다.
-- queued/running job을 프로젝트별 하나로 제한해 중복 AI 처리와 상태 덮어쓰기를 막는다.
create unique index if not exists jobs_one_active_job_per_project_idx
  on jobs (project_id)
  where status in ('queued', 'running');
