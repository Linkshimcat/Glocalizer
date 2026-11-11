alter table public.generation_projects
  add column selected_slots integer[];

create or replace function public.complete_generation(p_owner uuid, p_project uuid)
returns void language plpgsql security invoker set search_path = public as $$
declare
  v_selected integer[];
  v_completed integer[];
begin
  select coalesce(selected_slots, array(select generate_series(1, 23)))
    into v_selected
  from generation_projects
  where id = p_project and owner_id = p_owner and status = 'active'
  for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if exists (select 1 from generation_images where project_id = p_project and status in ('queued', 'running'))
    then raise exception 'RUNNING'; end if;

  select array_agg(distinct slot order by slot) into v_completed
  from generation_images where project_id = p_project and status = 'completed';
  if v_completed is distinct from array_prepend(0, v_selected) then raise exception 'INCOMPLETE'; end if;

  update generation_projects set status = 'completed', completed_at = now() where id = p_project;
end $$;
