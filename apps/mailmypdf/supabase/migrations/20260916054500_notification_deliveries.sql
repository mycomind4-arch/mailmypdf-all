-- Durable, concurrency-safe delivery claims for shared workflow notifications.
-- order_events remains the human-readable audit trail; this table is the
-- idempotency state machine that prevents two webhook paths from sending the
-- same transactional message.

create table if not exists public.notification_deliveries (
  idempotency_key text primary key,
  status text not null check (status in ('pending','sending','sent','failed','skipped')),
  provider text,
  provider_message_id text,
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  claimed_at timestamptz,
  sent_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notification_deliveries enable row level security;
grant all on public.notification_deliveries to service_role;
revoke all on public.notification_deliveries from anon, authenticated;

create or replace function public.claim_notification_delivery(
  p_idempotency_key text,
  p_now timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claimed boolean := false;
begin
  if p_idempotency_key is null or btrim(p_idempotency_key) = '' then
    raise exception 'notification idempotency key is required';
  end if;

  insert into public.notification_deliveries (
    idempotency_key,
    status,
    claimed_at,
    created_at,
    updated_at
  )
  values (
    p_idempotency_key,
    'sending',
    p_now,
    p_now,
    p_now
  )
  on conflict (idempotency_key) do update
  set
    status = 'sending',
    claimed_at = excluded.claimed_at,
    updated_at = excluded.updated_at,
    last_error = null,
    failed_at = null
  where
    notification_deliveries.status in ('pending', 'failed')
    or (
      notification_deliveries.status = 'sending'
      and notification_deliveries.claimed_at < excluded.claimed_at - interval '10 minutes'
    )
  returning true into v_claimed;

  return coalesce(v_claimed, false);
end;
$$;

revoke all on function public.claim_notification_delivery(text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.claim_notification_delivery(text, timestamptz)
  to service_role;

create index if not exists notification_deliveries_status_idx
  on public.notification_deliveries (status, updated_at);
