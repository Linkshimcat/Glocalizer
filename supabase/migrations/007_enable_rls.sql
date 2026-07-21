-- 기본적으로 Supabase는 public 스키마의 모든 테이블을 PostgREST로 노출한다.
-- 이 테이블들은 백엔드(service_role, RLS 우회)를 통해서만 접근해야 하므로,
-- RLS만 켜고 별도 정책(policy)은 만들지 않는다 — anon/authenticated 롤은 완전히 차단된다.
alter table projects enable row level security;
alter table assets enable row level security;
alter table ocr_regions enable row level security;
alter table translations enable row level security;
alter table jobs enable row level security;
alter table editor_states enable row level security;
