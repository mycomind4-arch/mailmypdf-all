-- Records Request: immutable approvals + payment-first mailing intents.

create table if not exists public.records_approvals (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  workflow_id text not null,
  artifact_json jsonb not null,
  recipient_json jsonb not null,
  artifact_hash text not null,
  recipient_hash text not null,
  document_sha256 text not null,
  status text not null default 'active' check (status in ('active','revoked')),
  approved_at timestamptz not null default now()
);

create index if not exists records_approvals_owner_idx on public.records_approvals(owner_id, approved_at desc);
create index if not exists records_approvals_workflow_idx on public.records_approvals(workflow_id, approved_at desc);

create table if not exists public.records_mailing_intents (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  workflow_id text not null,
  approval_id uuid not null references public.records_approvals(id) on delete restrict,
  stripe_session_id text unique,
  stripe_payment_intent_id text,
  stripe_price_cents integer not null check (stripe_price_cents > 0),
  quote_snapshot text,
  status text not null default 'approved' check (status in ('approved','paid','submitted','tracking','delivered','failed','expired','refunded')),
  mailing_method text not null check (mailing_method in ('first_class','certified','registered')),
  provider_order_id text,
  tracking_number text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists records_mailing_intents_owner_idx on public.records_mailing_intents(owner_id, updated_at desc);
create index if not exists records_mailing_intents_approval_idx on public.records_mailing_intents(approval_id);
create index if not exists records_mailing_intents_stripe_idx on public.records_mailing_intents(stripe_session_id);
create index if not exists records_mailing_intents_provider_idx on public.records_mailing_intents(provider_order_id);

alter table public.records_approvals enable row level security;
alter table public.records_mailing_intents enable row level security;

drop policy if exists records_approvals_select_own on public.records_approvals;
create policy records_approvals_select_own on public.records_approvals for select using (auth.uid()::text = owner_id);
drop policy if exists records_approvals_insert_own on public.records_approvals;
create policy records_approvals_insert_own on public.records_approvals for insert with check (auth.uid()::text = owner_id);
drop policy if exists records_approvals_update_own on public.records_approvals;
create policy records_approvals_update_own on public.records_approvals for update using (auth.uid()::text = owner_id) with check (auth.uid()::text = owner_id);

drop policy if exists records_mailing_intents_select_own on public.records_mailing_intents;
create policy records_mailing_intents_select_own on public.records_mailing_intents for select using (auth.uid()::text = owner_id);
drop policy if exists records_mailing_intents_insert_own on public.records_mailing_intents;
create policy records_mailing_intents_insert_own on public.records_mailing_intents for insert with check (auth.uid()::text = owner_id);
drop policy if exists records_mailing_intents_update_own on public.records_mailing_intents;
create policy records_mailing_intents_update_own on public.records_mailing_intents for update using (auth.uid()::text = owner_id) with check (auth.uid()::text = owner_id);

create or replace function public.records_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists records_mailing_intents_updated_at on public.records_mailing_intents;
create trigger records_mailing_intents_updated_at before update on public.records_mailing_intents for each row execute function public.records_set_updated_at();

create or replace function public.records_guard_approval_immutability()
returns trigger language plpgsql as $$
begin
  if new.owner_id is distinct from old.owner_id
     or new.workflow_id is distinct from old.workflow_id
     or new.artifact_json is distinct from old.artifact_json
     or new.recipient_json is distinct from old.recipient_json
     or new.artifact_hash is distinct from old.artifact_hash
     or new.recipient_hash is distinct from old.recipient_hash
     or new.document_sha256 is distinct from old.document_sha256
     or new.approved_at is distinct from old.approved_at then
    raise exception 'Records approval content is immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists records_approval_immutability on public.records_approvals;
create trigger records_approval_immutability before update on public.records_approvals for each row execute function public.records_guard_approval_immutability();

create or replace function public.records_guard_intent_immutability()
returns trigger language plpgsql as $$
begin
  if new.owner_id is distinct from old.owner_id
     or new.workflow_id is distinct from old.workflow_id
     or new.approval_id is distinct from old.approval_id
     or new.stripe_price_cents is distinct from old.stripe_price_cents
     or new.mailing_method is distinct from old.mailing_method
     or new.quote_snapshot is distinct from old.quote_snapshot then
    raise exception 'Records mailing intent approval and price fields are immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists records_mailing_intent_immutability on public.records_mailing_intents;
create trigger records_mailing_intent_immutability before update on public.records_mailing_intents for each row execute function public.records_guard_intent_immutability();
