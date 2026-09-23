-- 대표 캐릭터를 확정하면 남은 23장을 한 번의 요청으로 모두 큐에 넣는다. 워커가 서버에서
-- 큐를 비우므로 브라우저를 닫아도 생성이 이어지고, 4장씩 나눠 누를 필요가 없다.
-- 예약 비용은 장당 0.25 USD이므로 23장을 한꺼번에 예약해도 5.75 USD로 일일 예산 8 USD 안에 든다.
create or replace function public.enqueue_generation_batch(
  p_owner uuid,
  p_project uuid,
  p_slots integer[],
  p_prompts text[],
  p_reserve numeric,
  p_budget numeric
)
returns void language plpgsql security invoker set search_path = public as $$
declare
  v_index integer;
begin
  if array_length(p_slots, 1) is null
    or array_length(p_slots, 1) <> array_length(p_prompts, 1)
    or array_length(p_slots, 1) > 23
  then raise exception 'INVALID'; end if;
  if cardinality(p_slots) <> (select count(distinct value) from unnest(p_slots) as slots(value))
  then raise exception 'INVALID'; end if;

  for v_index in 1..array_length(p_slots, 1) loop
    perform public.enqueue_generation(
      p_owner,
      p_project,
      p_slots[v_index],
      p_prompts[v_index],
      p_reserve,
      p_budget
    );
  end loop;
end $$;

revoke all on function public.enqueue_generation_batch(uuid,uuid,integer[],text[],numeric,numeric) from public,anon,authenticated;
grant execute on function public.enqueue_generation_batch(uuid,uuid,integer[],text[],numeric,numeric) to service_role;
