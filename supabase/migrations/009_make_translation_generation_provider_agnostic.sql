do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'translations' and column_name = 'glm_candidates'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'translations' and column_name = 'generation_candidates'
  ) then
    alter table public.translations rename column glm_candidates to generation_candidates;
  end if;
end $$;
