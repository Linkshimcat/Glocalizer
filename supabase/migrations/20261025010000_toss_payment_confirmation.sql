alter table public.payments
  drop constraint if exists payments_status_check,
  add constraint payments_status_check check (status in ('pending','processing','done','failed','canceled')),
  add column if not exists confirmation_started_at timestamptz;

create unique index if not exists payments_toss_payment_key_idx
  on public.payments(toss_payment_key) where toss_payment_key is not null;

create or replace function public.claim_payment_confirmation(
  p_order_id text, p_user_id uuid, p_amount integer, p_payment_key text
) returns text
language plpgsql security definer set search_path=public as $$
declare payment public.payments%rowtype;
begin
  select * into payment from public.payments where order_id=p_order_id for update;
  if not found or payment.user_id <> p_user_id then raise exception 'PAYMENT_ORDER_NOT_FOUND'; end if;
  if payment.amount <> p_amount then raise exception 'PAYMENT_AMOUNT_MISMATCH'; end if;

  if payment.status='done' then
    if payment.toss_payment_key=p_payment_key then return 'done'; end if;
    raise exception 'PAYMENT_ALREADY_PROCESSED';
  end if;
  if payment.status='processing' then
    if payment.toss_payment_key <> p_payment_key then raise exception 'PAYMENT_ALREADY_PROCESSED'; end if;
    if payment.confirmation_started_at > now() - interval '45 seconds' then
      raise exception 'PAYMENT_CONFIRM_IN_PROGRESS';
    end if;
    update public.payments set confirmation_started_at=now(), updated_at=now() where id=payment.id;
    return 'recover';
  end if;
  if payment.status <> 'pending' then raise exception 'PAYMENT_ALREADY_PROCESSED'; end if;

  update public.payments set status='processing', toss_payment_key=p_payment_key,
    confirmation_started_at=now(), updated_at=now() where id=payment.id;
  return 'claimed';
end;
$$;

create or replace function public.finalize_payment_and_membership(
  p_order_id text, p_user_id uuid, p_payment_key text, p_method text,
  p_raw_response jsonb, p_membership_expires_at timestamptz
) returns void
language plpgsql security definer set search_path=public as $$
declare payment public.payments%rowtype;
begin
  select * into payment from public.payments where order_id=p_order_id for update;
  if not found or payment.user_id <> p_user_id then raise exception 'PAYMENT_ORDER_NOT_FOUND'; end if;
  if payment.status='done' and payment.toss_payment_key=p_payment_key then return; end if;
  if payment.status <> 'processing' or payment.toss_payment_key <> p_payment_key then
    raise exception 'PAYMENT_ALREADY_PROCESSED';
  end if;

  update public.users set membership_plan=payment.plan_id,
    membership_expires_at=p_membership_expires_at, updated_at=now() where id=p_user_id;
  if not found then raise exception 'PAYMENT_ORDER_NOT_FOUND'; end if;

  update public.payments set status='done', method=p_method, raw_response=p_raw_response,
    approved_at=now(), confirmation_started_at=null, updated_at=now() where id=payment.id;
end;
$$;

create or replace function public.fail_payment_confirmation(
  p_order_id text, p_payment_key text, p_raw_response jsonb
) returns void
language sql security definer set search_path=public as $$
  update public.payments set status='failed', raw_response=p_raw_response,
    confirmation_started_at=null, updated_at=now()
  where order_id=p_order_id and status='processing' and toss_payment_key=p_payment_key;
$$;

revoke all on function public.claim_payment_confirmation(text,uuid,integer,text) from public,anon,authenticated;
revoke all on function public.finalize_payment_and_membership(text,uuid,text,text,jsonb,timestamptz) from public,anon,authenticated;
revoke all on function public.fail_payment_confirmation(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.claim_payment_confirmation(text,uuid,integer,text) to service_role;
grant execute on function public.finalize_payment_and_membership(text,uuid,text,text,jsonb,timestamptz) to service_role;
grant execute on function public.fail_payment_confirmation(text,text,jsonb) to service_role;

create or replace function public.backend_schema_ready() returns boolean language sql security invoker set search_path=public as $$
 select (select bool_and(exists(select 1 from information_schema.columns c where c.table_schema='public' and c.table_name=required.tab and c.column_name=required.col))
 from (values ('users','session_version'),('users','deleting_at'),('users','membership_plan'),('users','kakao_id'),('projects','deleting_at'),('jobs','lease_token'),('jobs','asset_ids'),('jobs','initial_states'),('jobs','payload'),
 ('generation_images','lease_token'),('generation_images','heartbeat_at'),('generation_images','artifact_path'),('deletion_tasks','paths'),
 ('user_sessions','revoked_at'),('user_sessions','expires_at'),('payments','status'),('payments','confirmation_started_at')) required(tab,col))
 and (select bool_and(case when to_regprocedure(signature) is null then false else has_function_privilege(current_user,to_regprocedure(signature),'EXECUTE') end)
 from unnest(array['public.enqueue_localization_job(uuid,text[],jsonb)','public.claim_localization_job(text)','public.recover_localization_jobs(integer)',
 'public.mutate_localization_job(uuid,uuid,text,uuid,jsonb)','public.touch_localization_lease(uuid,uuid)','public.finish_localization_job(uuid,uuid,text,text,boolean)',
 'public.claim_generation_job(text)','public.touch_generation_lease(uuid,uuid)','public.recover_generation_jobs(integer)','public.mutate_generation_job(uuid,uuid,jsonb)',
 'public.reserve_deletion(text,uuid)','public.claim_deletion(uuid)','public.touch_deletion(uuid,uuid)','public.finish_deletion(uuid,uuid,text)','public.orphan_artifact_paths()','public.mark_orphan_artifacts(text[])',
 'public.claim_payment_confirmation(text,uuid,integer,text)','public.finalize_payment_and_membership(text,uuid,text,text,jsonb,timestamp with time zone)','public.fail_payment_confirmation(text,text,jsonb)']) signature);
$$;
