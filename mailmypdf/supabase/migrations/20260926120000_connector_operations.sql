-- Durable, owner-scoped connector operation state.
--
-- Connector clients can lose an HTTP response after MailMyPDF has started or
-- completed work. This table lets a retry recover the same operation by its
-- idempotency key and lets the owner poll by operation id without repeating
-- an external effect. Only trusted server code writes; authenticated users may
-- read their own rows through RLS.

create unique index if not exists workflow_cases_id_owner_idx
  on public.workflow_cases(id, owner_id);

create table if not exists public.connector_operations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  matter_id uuid not null,
  kind text not null check (kind in (
    'ingest_document',
    'save_matter_input',
    'analyze_matter',
    'generate_draft',
    'save_draft',
    'preview_packet',
    'approve_packet',
    'prepare_checkout',
    'mailing'
  )),
  idempotency_key text not null check (
    length(idempotency_key) between 8 and 128
    and idempotency_key ~ '^[A-Za-z0-9._:-]+$'
  ),
  request_sha256 text not null check (request_sha256 ~ '^[0-9a-f]{64}$'),
  state text not null default 'queued' check (state in (
    'queued', 'running', 'waiting_for_user', 'succeeded', 'failed', 'cancelled'
  )),
  revision integer not null default 1 check (revision >= 1),
  required_action text,
  result jsonb,
  error jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint connector_operation_owner_matter_fk
    foreign key (matter_id, owner_id)
    references public.workflow_cases(id, owner_id)
    on delete cascade,
  constraint connector_operation_idempotency_unique
    unique (owner_id, kind, idempotency_key),
  constraint connector_operation_state_payload check (
    (state in ('queued', 'running', 'cancelled')
      and required_action is null and result is null and error is null)
    or
    (state = 'waiting_for_user'
      and length(trim(required_action)) > 0 and result is null and error is null)
    or
    (state = 'succeeded'
      and required_action is null and result is not null and error is null)
    or
    (state = 'failed'
      and required_action is null and result is null
      and jsonb_typeof(error) = 'object'
      and length(coalesce(error->>'code', '')) > 0
      and length(coalesce(error->>'message', '')) > 0
      and jsonb_typeof(error->'retryable') = 'boolean')
  )
);

create index if not exists connector_operations_owner_updated_idx
  on public.connector_operations(owner_id, updated_at desc);
create index if not exists connector_operations_matter_idx
  on public.connector_operations(matter_id, updated_at desc);

create or replace function public.enforce_connector_operation_transition()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.id <> old.id
    or new.owner_id <> old.owner_id
    or new.matter_id <> old.matter_id
    or new.kind <> old.kind
    or new.idempotency_key <> old.idempotency_key
    or new.request_sha256 <> old.request_sha256
    or new.created_at <> old.created_at then
    raise exception 'connector operation identity is immutable';
  end if;

  if new.revision <> old.revision + 1 then
    raise exception 'connector operation revision must advance exactly once';
  end if;
  if new.updated_at < old.updated_at then
    raise exception 'connector operation time cannot move backward';
  end if;

  if not (
    (old.state = 'queued' and new.state in ('running', 'waiting_for_user', 'failed', 'cancelled'))
    or (old.state = 'running' and new.state in ('waiting_for_user', 'succeeded', 'failed', 'cancelled'))
    or (old.state = 'waiting_for_user' and new.state in ('running', 'failed', 'cancelled'))
  ) then
    raise exception 'invalid connector operation transition from % to %', old.state, new.state;
  end if;

  return new;
end;
$$;

drop trigger if exists connector_operations_transition on public.connector_operations;
create trigger connector_operations_transition
  before update on public.connector_operations
  for each row execute function public.enforce_connector_operation_transition();

alter table public.connector_operations enable row level security;

drop policy if exists "owners read their connector operations" on public.connector_operations;
create policy "owners read their connector operations"
  on public.connector_operations for select to authenticated
  using (owner_id = auth.uid());

revoke all on public.connector_operations from anon, authenticated;
grant select on public.connector_operations to authenticated;

comment on table public.connector_operations is
  'Durable owner/matter/idempotency-bound connector operation status; server-write, owner-read.';
