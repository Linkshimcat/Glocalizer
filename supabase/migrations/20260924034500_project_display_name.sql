-- 대시보드에서 작업 이름을 직접 바꿀 수 있게 한다. 현지화 작업은 지금까지 첫 파일명을
-- 제목으로 써 왔고 생성 작업은 AI 프롬프트 전문을 그대로 써 왔다. 둘 다 사용자가 붙인
-- 이름이 있으면 그것을 쓰고, 없으면(null) 기존 규칙을 그대로 따른다.
alter table public.projects add column name text;
alter table public.generation_projects add column name text;
