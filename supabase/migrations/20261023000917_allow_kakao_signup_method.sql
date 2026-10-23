alter table public.users
  drop constraint if exists users_signup_method_check,
  add constraint users_signup_method_check
    check (signup_method in ('email', 'naver', 'google', 'kakao'));
