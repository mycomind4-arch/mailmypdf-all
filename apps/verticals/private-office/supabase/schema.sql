create extension if not exists pgcrypto;

-- Private Office matters table
create table if not exists public.private_office_matters (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  workflow_id text not null,
  document_id text not null,
  title text not null,
  status text not null check (status in ('draft','validated','review','approved','payment_pending','submitted','tracking','completed','failed','cancelled')),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_draft_hash text,
  draft_hash text,
  submitted_at timestamptz,
  provider_order_id text,
  tracking_number text,
  proof_hash text
);

create index if not exists private_office_matters_owner_idx on public.private_office_matters(owner_id, updated_at desc);
create index if not exists private_office_matters_workflow_idx on public.private_office_matters(owner_id, workflow_id, updated_at desc);
create unique index if not exists private_office_matters_provider_order_idx on public.private_office_matters(provider_order_id) where provider_order_id is not null;

-- Private Office evidence table
create table if not exists public.private_office_evidence (
  id text primary key,
  matter_id uuid not null references public.private_office_matters(id) on delete cascade,
  owner_id text not null,
  description text not null,
  status text not null check (status in ('missing','requested','provided','verified','rejected','not_applicable')),
  source_document_id text,
  supports_finding_ids jsonb not null default '[]'::jsonb,
  verified_at timestamptz,
  verified_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists private_office_evidence_matter_idx on public.private_office_evidence(matter_id, status);
create index if not exists private_office_evidence_owner_idx on public.private_office_evidence(owner_id, updated_at desc);

-- Private Office events table (audit trail — immutable)
create table if not exists public.private_office_events (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.private_office_matters(id) on delete cascade,
  owner_id text not null,
  event_type text not null check (event_type in ('matter_created','intake_updated','document_added','evidence_added','evidence_verified','evidence_rejected','analysis_generated','draft_generated','draft_revised','draft_reviewed','approval_granted','approval_invalidated','fulfillment_requested','fulfillment_rejected','fulfillment_submitted','delivery_recorded','proof_recorded','escalation_triggered')),
  actor_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists private_office_events_matter_idx on public.private_office_events(matter_id, created_at desc);
create index if not exists private_office_events_owner_idx on public.private_office_events(owner_id, created_at desc);

-- Private Office mailing intents table (durable idempotency outbox)
create table if not exists public.private_office_mailing_intents (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  workflow_id text not null,
  matter_id uuid references public.private_office_matters(id) on delete set null,
  stripe_session_id text unique,
  stripe_payment_intent_id text,
  status text not null default 'pending' check (status in ('pending','submitted','failed','cancelled')),
  mailing_method text not null,
  draft_content text not null,
  draft_hash text not null,
  recipient jsonb not null,
  matter_reference text,
  matter_type text not null default 'private-office',
  provider_order_id text,
  tracking_number text,
  idempotency_key text not null,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists private_office_mailing_intents_owner_idx on public.private_office_mailing_intents(owner_id, updated_at desc);
create index if not exists private_office_mailing_intents_stripe_idx on public.private_office_mailing_intents(stripe_session_id);
create index if not exists private_office_mailing_intents_provider_idx on public.private_office_mailing_intents(provider_order_id);
create unique index if not exists private_office_mailing_intents_idempotency_idx on public.private_office_mailing_intents(idempotency_key, owner_id);

-- Enable Row Level Security
alter table public.private_office_matters enable row level security;
alter table public.private_office_evidence enable row level security;
alter table public.private_office_events enable row level security;
alter table public.private_office_mailing_intents enable row level security;

-- ─────────────────────────────────────────────────────────────────────────
-- RLS Policies
--
-- SECURITY MODEL: Clients can only READ their own data. All writes go
-- through server functions that use the service role key (which bypasses
-- RLS) and enforce domain logic (state machine transitions, approval
-- integrity, evidence verification, event authenticity).
--
-- This prevents a malicious authenticated client from:
--   • forging approval_granted events via direct REST API inserts
--   • setting matter status to 'approved' via direct PATCH
--   • marking evidence as 'verified' without server-side verification
--   • changing approved_draft_hash to bypass draft version integrity
--   • inserting mailing intents that bypass the fulfillment gates
-- ─────────────────────────────────────────────────────────────────────────

-- Matters: client can read only; writes go through server functions
drop policy if exists private_office_matters_select_own on public.private_office_matters;
create policy private_office_matters_select_own on public.private_office_matters for select using (auth.uid()::text = owner_id);
drop policy if exists private_office_matters_insert_own on public.private_office_matters;
drop policy if exists private_office_matters_update_own on public.private_office_matters;
drop policy if exists private_office_matters_delete_own on public.private_office_matters;

-- Evidence: client can read only; writes go through server functions
drop policy if exists private_office_evidence_select_own on public.private_office_evidence;
create policy private_office_evidence_select_own on public.private_office_evidence for select using (auth.uid()::text = owner_id);
drop policy if exists private_office_evidence_insert_own on public.private_office_evidence;
drop policy if exists private_office_evidence_update_own on public.private_office_evidence;
drop policy if exists private_office_evidence_delete_own on public.private_office_evidence;

-- Events: client can read only; inserts go through server functions (service role)
-- No client-facing insert/update/delete policies — events are server-authored only
drop policy if exists private_office_events_select_own on public.private_office_events;
create policy private_office_events_select_own on public.private_office_events for select using (auth.uid()::text = owner_id);
drop policy if exists private_office_events_insert_own on public.private_office_events;

-- Mailing intents: client can read only; writes go through server functions
drop policy if exists private_office_mailing_intents_select_own on public.private_office_mailing_intents;
create policy private_office_mailing_intents_select_own on public.private_office_mailing_intents for select using (auth.uid()::text = owner_id);
drop policy if exists private_office_mailing_intents_insert_own on public.private_office_mailing_intents;
drop policy if exists private_office_mailing_intents_update_own on public.private_office_mailing_intents;

-- Updated_at triggers
create or replace function public.set_private_office_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists private_office_matters_updated_at on public.private_office_matters;
create trigger private_office_matters_updated_at before update on public.private_office_matters for each row execute function public.set_private_office_updated_at();

drop trigger if exists private_office_evidence_updated_at on public.private_office_evidence;
create trigger private_office_evidence_updated_at before update on public.private_office_evidence for each row execute function public.set_private_office_updated_at();

drop trigger if exists private_office_mailing_intents_updated_at on public.private_office_mailing_intents;
create trigger private_office_mailing_intents_updated_at before update on public.private_office_mailing_intents for each row execute function public.set_private_office_updated_at();

-- Owner immutability guard for mailing intents
create or replace function public.prevent_private_office_mailing_owner_change()
returns trigger language plpgsql as $$
begin
  if new.owner_id is distinct from old.owner_id then
    raise exception 'Cannot change mailing intent owner';
  end if;
  return new;
end;
$$;

drop trigger if exists private_office_mailing_intents_owner_guard on public.private_office_mailing_intents;
create trigger private_office_mailing_intents_owner_guard before update on public.private_office_mailing_intents for each row execute function public.prevent_private_office_mailing_owner_change();

-- Draft hash immutability on mailing intents (draft_hash set at creation, cannot be changed)
create or replace function public.prevent_draft_hash_change()
returns trigger language plpgsql as $$
begin
  if new.draft_hash is distinct from old.draft_hash then
    raise exception 'Cannot change draft hash on mailing intent';
  end if;
  return new;
end;
$$;

drop trigger if exists private_office_mailing_intents_draft_hash_guard on public.private_office_mailing_intents;
create trigger private_office_mailing_intents_draft_hash_guard before update on public.private_office_mailing_intents for each row execute function public.prevent_draft_hash_change();


-- ─────────────────────────────────────────────────────────────────────────
-- Compound workflow matters
--
-- Compound workflows coordinate multiple governed phases under one durable
-- Private Office matter. Clients may read their own state, but only
-- authenticated server functions using the service role may mutate it.
-- State transitions and audit events are committed atomically through RPCs.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.private_office_compound_matters (
  id uuid primary key,
  owner_id text not null,
  workflow_id text not null check (
    workflow_id in (
      'government-accusation-defense',
      'property-estate-reconstruction',
      'government-accountability-investigation',
      'personal-legal-autonomy-asset-control'
    )
  ),
  status text not null check (
    status in ('not_started','active','blocked','awaiting_human_review','complete')
  ),
  version integer not null default 1 check (version > 0),
  state jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint private_office_compound_state_object_check check (jsonb_typeof(state) = 'object')
);

create index if not exists private_office_compound_matters_owner_idx
  on public.private_office_compound_matters(owner_id, updated_at desc);
create index if not exists private_office_compound_matters_workflow_idx
  on public.private_office_compound_matters(owner_id, workflow_id, updated_at desc);
create index if not exists private_office_compound_matters_status_idx
  on public.private_office_compound_matters(owner_id, status, updated_at desc);

create table if not exists public.private_office_compound_events (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.private_office_compound_matters(id) on delete cascade,
  owner_id text not null,
  event_type text not null check (
    event_type in (
      'compound_matter_created',
      'compound_phase_started',
      'compound_gate_passed',
      'compound_gate_blocked',
      'compound_phase_completed'
    )
  ),
  actor_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint private_office_compound_event_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

create index if not exists private_office_compound_events_matter_idx
  on public.private_office_compound_events(matter_id, created_at asc);
create index if not exists private_office_compound_events_owner_idx
  on public.private_office_compound_events(owner_id, created_at desc);

alter table public.private_office_compound_matters enable row level security;
alter table public.private_office_compound_events enable row level security;

drop policy if exists private_office_compound_matters_select_own
  on public.private_office_compound_matters;
create policy private_office_compound_matters_select_own
  on public.private_office_compound_matters
  for select using (auth.uid()::text = owner_id);

drop policy if exists private_office_compound_matters_insert_own
  on public.private_office_compound_matters;
drop policy if exists private_office_compound_matters_update_own
  on public.private_office_compound_matters;
drop policy if exists private_office_compound_matters_delete_own
  on public.private_office_compound_matters;

drop policy if exists private_office_compound_events_select_own
  on public.private_office_compound_events;
create policy private_office_compound_events_select_own
  on public.private_office_compound_events
  for select using (auth.uid()::text = owner_id);
drop policy if exists private_office_compound_events_insert_own
  on public.private_office_compound_events;
drop policy if exists private_office_compound_events_update_own
  on public.private_office_compound_events;
drop policy if exists private_office_compound_events_delete_own
  on public.private_office_compound_events;

drop trigger if exists private_office_compound_matters_updated_at
  on public.private_office_compound_matters;
create trigger private_office_compound_matters_updated_at
  before update on public.private_office_compound_matters
  for each row execute function public.set_private_office_updated_at();

create or replace function public.prevent_private_office_compound_envelope_change()
returns trigger language plpgsql as $$
begin
  if new.owner_id is distinct from old.owner_id then
    raise exception 'Cannot change compound matter owner';
  end if;
  if new.workflow_id is distinct from old.workflow_id then
    raise exception 'Cannot change compound matter workflow';
  end if;
  if new.id is distinct from old.id then
    raise exception 'Cannot change compound matter id';
  end if;
  return new;
end;
$$;

drop trigger if exists private_office_compound_envelope_guard
  on public.private_office_compound_matters;
create trigger private_office_compound_envelope_guard
  before update on public.private_office_compound_matters
  for each row execute function public.prevent_private_office_compound_envelope_change();

create or replace function public.private_office_create_compound_matter(
  p_id uuid,
  p_owner_id text,
  p_workflow_id text,
  p_status text,
  p_state jsonb,
  p_actor_id text
)
returns setof public.private_office_compound_matters
language plpgsql
security definer
set search_path = public
as $$
declare
  created public.private_office_compound_matters%rowtype;
begin
  if nullif(trim(p_owner_id), '') is null then
    raise exception 'owner id is required';
  end if;
  if p_state->>'id' is distinct from p_id::text then
    raise exception 'state id does not match row id';
  end if;
  if p_state->>'ownerId' is distinct from p_owner_id then
    raise exception 'state owner does not match row owner';
  end if;
  if p_state->>'workflowId' is distinct from p_workflow_id then
    raise exception 'state workflow does not match row workflow';
  end if;
  if coalesce((p_state->>'version')::integer, 0) <> 1 then
    raise exception 'new compound matter state must begin at version 1';
  end if;

  insert into public.private_office_compound_matters (
    id, owner_id, workflow_id, status, version, state
  )
  values (
    p_id, p_owner_id, p_workflow_id, p_status, 1, p_state
  )
  returning * into created;

  insert into public.private_office_compound_events (
    matter_id, owner_id, event_type, actor_id, metadata
  )
  values (
    p_id,
    p_owner_id,
    'compound_matter_created',
    p_actor_id,
    jsonb_build_object('workflowId', p_workflow_id)
  );

  return next created;
end;
$$;

create or replace function public.private_office_commit_compound_state(
  p_matter_id uuid,
  p_owner_id text,
  p_expected_version integer,
  p_status text,
  p_state jsonb,
  p_event_type text,
  p_actor_id text,
  p_metadata jsonb
)
returns setof public.private_office_compound_matters
language plpgsql
security definer
set search_path = public
as $$
declare
  current_workflow text;
  updated public.private_office_compound_matters%rowtype;
begin
  select workflow_id
    into current_workflow
  from public.private_office_compound_matters
  where id = p_matter_id
    and owner_id = p_owner_id
    and version = p_expected_version
  for update;

  if not found then
    return;
  end if;

  if p_state->>'id' is distinct from p_matter_id::text then
    raise exception 'state id does not match row id';
  end if;
  if p_state->>'ownerId' is distinct from p_owner_id then
    raise exception 'state owner does not match row owner';
  end if;
  if p_state->>'workflowId' is distinct from current_workflow then
    raise exception 'state workflow does not match row workflow';
  end if;
  if coalesce((p_state->>'version')::integer, 0) <> p_expected_version + 1 then
    raise exception 'state version must advance by exactly one';
  end if;
  if p_event_type not in (
    'compound_phase_started',
    'compound_gate_passed',
    'compound_gate_blocked',
    'compound_phase_completed'
  ) then
    raise exception 'unsupported compound event type';
  end if;
  if jsonb_typeof(coalesce(p_metadata, '{}'::jsonb)) <> 'object' then
    raise exception 'compound event metadata must be an object';
  end if;

  update public.private_office_compound_matters
  set
    status = p_status,
    version = p_expected_version + 1,
    state = p_state,
    updated_at = now()
  where id = p_matter_id
    and owner_id = p_owner_id
    and version = p_expected_version
  returning * into updated;

  if not found then
    return;
  end if;

  insert into public.private_office_compound_events (
    matter_id, owner_id, event_type, actor_id, metadata
  )
  values (
    p_matter_id,
    p_owner_id,
    p_event_type,
    p_actor_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return next updated;
end;
$$;

revoke all on function public.private_office_create_compound_matter(
  uuid, text, text, text, jsonb, text
) from public, anon, authenticated;
grant execute on function public.private_office_create_compound_matter(
  uuid, text, text, text, jsonb, text
) to service_role;

revoke all on function public.private_office_commit_compound_state(
  uuid, text, integer, text, jsonb, text, text, jsonb
) from public, anon, authenticated;
grant execute on function public.private_office_commit_compound_state(
  uuid, text, integer, text, jsonb, text, text, jsonb
) to service_role;
