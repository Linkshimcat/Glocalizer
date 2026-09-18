-- 사용자가 계정 정보에서 직접 바꾼 닉네임/프로필 사진은 네이버 재로그인 때 덮어쓰지 않는다.
alter table public.users
  add column if not exists name_customized boolean not null default false,
  add column if not exists avatar_customized boolean not null default false;
