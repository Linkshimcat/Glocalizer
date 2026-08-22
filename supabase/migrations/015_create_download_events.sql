create table download_events (
  id uuid primary key default gen_random_uuid(),

  project_id uuid not null
    references projects(id)
    on delete cascade,

  kind text not null,
  language_code text,

  created_at timestamptz not null default now()
);

create index download_events_project_id_idx on download_events (project_id);

comment on column download_events.kind is '다운로드 종류: single(언어별 PNG 1장) | zip(전체 언어 ZIP)';
comment on column download_events.language_code is 'kind=single일 때만 채워짐. zip은 여러 언어를 한 번에 담으므로 null.';

alter table download_events enable row level security;
