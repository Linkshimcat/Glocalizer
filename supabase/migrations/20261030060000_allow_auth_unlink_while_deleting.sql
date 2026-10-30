-- 구글 계정 탈퇴가 항상 실패하던 문제를 고친다.
--
-- 탈퇴 작업(deletion_tasks)은 users 행에 deleting_at을 찍은 뒤 Supabase Auth 사용자를 지운다. 그런데
-- users.supabase_auth_id는 auth.users를 ON DELETE SET NULL로 참조하므로, Auth 사용자를 지우는 순간
-- users 행이 UPDATE(supabase_auth_id = null)된다. guard_user_deletion 트리거는 deleting_at이 있는 users 행의
-- 모든 UPDATE를 ACCOUNT_DELETING으로 막아서, 이 연쇄 갱신까지 막혔고 Auth 삭제가 500으로 실패했다.
-- 결과: 탈퇴가 영원히 끝나지 않고 users 행이 deleting_at 상태로 남아 같은 구글 계정으로 다시 로그인·가입할 수 없었다.
--
-- supabase_auth_id를 값 → null로 바꾸는 갱신만 통과시킨다(다른 컬럼이 바뀌면 그대로 막는다).
-- backend_schema_ready()는 함수 본문만 바뀌고 필요한 객체는 그대로라서 건드리지 않는다.
create or replace function public.guard_deleting_owner_project() returns trigger language plpgsql set search_path = public as $$
declare owner uuid; pid uuid; generation boolean:=false; deleting timestamptz;
begin
 if tg_table_name='users' then
  if old.deleting_at is not null then
   if old.supabase_auth_id is not null and new.supabase_auth_id is null
    and (to_jsonb(new) - 'supabase_auth_id') = (to_jsonb(old) - 'supabase_auth_id') then return new; end if;
   raise exception 'ACCOUNT_DELETING';
  end if;
  return new;
 elsif tg_table_name='projects' then owner:=new.owner_id;pid:=new.id;
 elsif tg_table_name='generation_projects' then owner:=new.owner_id;pid:=new.id;generation:=true;
 elsif tg_table_name in ('assets','jobs') then pid:=new.project_id;select owner_id into owner from projects where id=pid;
 elsif tg_table_name='generation_images' then pid:=new.project_id;generation:=true;select owner_id into owner from generation_projects where id=pid;
 elsif tg_table_name='ocr_regions' then select project_id into pid from assets where id=new.asset_id;select owner_id into owner from projects where id=pid;
 elsif tg_table_name='editor_states' then
  select project_id into pid from assets where id=new.asset_id;select owner_id into owner from projects where id=pid;
 elsif tg_table_name='translations' then
  select a.project_id into pid from assets a join ocr_regions r on r.asset_id=a.id where r.id=new.ocr_region_id;
  select owner_id into owner from projects where id=pid;
 end if;
 if owner is not null then
  select deleting_at into deleting from users where id=owner for update;
  if not found or deleting is not null then raise exception 'ACCOUNT_DELETING';end if;
 end if;
 if generation then select deleting_at into deleting from generation_projects where id=pid for update;
 else select deleting_at into deleting from projects where id=pid for update;end if;
 if deleting is not null then raise exception 'PROJECT_DELETING';end if;
 if tg_table_name='assets' and exists(select 1 from jobs where project_id=pid and status in ('queued','running')
  and id::text is distinct from current_setting('app.localization_job',true)) then raise exception 'PROCESS_ALREADY_RUNNING';end if;
 return new;
end $$;
