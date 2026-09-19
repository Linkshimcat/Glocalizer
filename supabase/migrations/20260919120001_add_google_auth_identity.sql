alter table public.users
  add column if not exists supabase_auth_id uuid references auth.users(id) on delete set null,
  add column if not exists signup_method text;

-- Google 도입 이전 계정은 password_hash 유무만으로 최초 가입 방식을 정확히 복원할 수 있다.
update public.users
set signup_method = case when password_hash is not null then 'email' else 'naver' end
where signup_method is null;

alter table public.users
  alter column signup_method set not null,
  drop constraint if exists users_signup_method_check,
  add constraint users_signup_method_check check (signup_method in ('email', 'naver', 'google')),
  drop constraint if exists users_login_method_present,
  add constraint users_login_method_present check (
    email is not null or naver_id is not null or supabase_auth_id is not null
  );

create unique index if not exists users_supabase_auth_id_idx
  on public.users (supabase_auth_id)
  where supabase_auth_id is not null;
