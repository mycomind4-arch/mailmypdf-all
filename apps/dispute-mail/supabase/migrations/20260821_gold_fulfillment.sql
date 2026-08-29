-- Gold-standard ownership policies + payment-first fulfillment for Dispute Mail.

create table if not exists public.mailing_intents (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  workflow_id text not null,
  case_id uuid references public.dispute_cases(id) on delete set null,
  stripe_session_id text unique,
  stripe_payment_intent_id text,
  status text not null default 'pending',
  mailing_method text not null,
  draft_content text not null,
  recipient jsonb not null,
  matter_reference text,
  matter_type text not null default 'dispute-mail',
  provider_order_id text,
  tracking_number text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists dispute_mailing_intents_owner_idx on public.mailing_intents(owner_id, updated_at desc);
create index if not exists dispute_mailing_intents_stripe_idx on public.mailing_intents(stripe_session_id);
create index if not exists dispute_mailing_intents_provider_idx on public.mailing_intents(provider_order_id);

alter table public.mailing_intents enable row level security;

-- Existing dispute tables were RLS-enabled without policies. These policies
-- make owner_id/auth.uid() the authoritative tenant boundary.
drop policy if exists dispute_cases_select_own on public.dispute_cases;
create policy dispute_cases_select_own on public.dispute_cases for select using (auth.uid()::text = owner_id);
drop policy if exists dispute_cases_insert_own on public.dispute_cases;
create policy dispute_cases_insert_own on public.dispute_cases for insert with check (auth.uid()::text = owner_id);
drop policy if exists dispute_cases_update_own on public.dispute_cases;
create policy dispute_cases_update_own on public.dispute_cases for update using (auth.uid()::text = owner_id) with check (auth.uid()::text = owner_id);
drop policy if exists dispute_cases_delete_own on public.dispute_cases;
create policy dispute_cases_delete_own on public.dispute_cases for delete using (auth.uid()::text = owner_id);

drop policy if exists dispute_case_evidence_select_own on public.dispute_case_evidence;
create policy dispute_case_evidence_select_own on public.dispute_case_evidence for select using (auth.uid()::text = owner_id);
drop policy if exists dispute_case_evidence_insert_own on public.dispute_case_evidence;
create policy dispute_case_evidence_insert_own on public.dispute_case_evidence for insert with check (auth.uid()::text = owner_id);
drop policy if exists dispute_case_evidence_update_own on public.dispute_case_evidence;
create policy dispute_case_evidence_update_own on public.dispute_case_evidence for update using (auth.uid()::text = owner_id) with check (auth.uid()::text = owner_id);
drop policy if exists dispute_case_evidence_delete_own on public.dispute_case_evidence;
create policy dispute_case_evidence_delete_own on public.dispute_case_evidence for delete using (auth.uid()::text = owner_id);

drop policy if exists dispute_case_events_select_own on public.dispute_case_events;
create policy dispute_case_events_select_own on public.dispute_case_events for select using (auth.uid()::text = owner_id);
drop policy if exists dispute_case_events_insert_own on public.dispute_case_events;
create policy dispute_case_events_insert_own on public.dispute_case_events for insert with check (auth.uid()::text = owner_id);

-- Mailing intents are account-owned and mutable only by the owner.
drop policy if exists dispute_mailing_intents_select_own on public.mailing_intents;
create policy dispute_mailing_intents_select_own on public.mailing_intents for select using (auth.uid()::text = owner_id);
drop policy if exists dispute_mailing_intents_insert_own on public.mailing_intents;
create policy dispute_mailing_intents_insert_own on public.mailing_intents for insert with check (auth.uid()::text = owner_id);
drop policy if exists dispute_mailing_intents_update_own on public.mailing_intents;
create policy dispute_mailing_intents_update_own on public.mailing_intents for update using (auth.uid()::text = owner_id) with check (auth.uid()::text = owner_id);

drop function if exists public.set_dispute_mailing_intent_updated_at();
create function public.set_dispute_mailing_intent_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists dispute_mailing_intents_updated_at on public.mailing_intents;
create trigger dispute_mailing_intents_updated_at before update on public.mailing_intents for each row execute function public.set_dispute_mailing_intent_updated_at();

drop function if exists public.prevent_dispute_mailing_owner_change();
create function public.prevent_dispute_mailing_owner_change()
returns trigger language plpgsql as $$
begin
  if new.owner_id is distinct from old.owner_id then
    raise exception 'Cannot change mailing intent owner';
  end if;
  return new;
end;
$$;
create trigger dispute_mailing_intents_owner_guard before update on public.mailing_intents for each row execute function public.prevent_dispute_mailing_owner_change();
