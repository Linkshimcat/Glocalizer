alter table public.user_sessions
  drop constraint if exists user_sessions_login_method_check,
  add constraint user_sessions_login_method_check
    check (login_method in ('email', 'naver', 'google', 'kakao'));
