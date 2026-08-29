-- Payment-first fulfillment intents for Immigration Mail.
-- Durable state bridges the Stripe redirect to authenticated MailMyPDF submission.

create table if not exists public.mailing_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workflow_id text not null,
  correspondence_id uuid,
  stripe_session_id text unique,
  stripe_payment_intent_id text,
  status text not null default 'pending',
  mailing_method text not null,
  draft_content text not null,
  recipient jsonb not null,
  matter_reference text,
  matter_type text not null default 'immigration-mail',
  legal_reference jsonb,
  provider_order_id text,
  tracking_number text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mailing_intents_user_id_idx on public.mailing_intents(user_id);
create index if not exists mailing_intents_status_idx on public.mailing_intents(status);
create index if not exists mailing_intents_stripe_session_idx on public.mailing_intents(stripe_session_id);
create index if not exists mailing_intents_provider_idx on public.mailing_intents(provider_order_id);

alter table public.mailing_intents enable row level security;

drop policy if exists mailing_intents_select_own on public.mailing_intents;
create policy mailing_intents_select_own on public.mailing_intents
  for select using (auth.uid() = user_id);

drop policy if exists mailing_intents_insert_own on public.mailing_intents;
create policy mailing_intents_insert_own on public.mailing_intents
  for insert with check (auth.uid() = user_id);

drop policy if exists mailing_intents_update_own on public.mailing_intents;
create policy mailing_intents_update_own on public.mailing_intents
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.mailing_intents_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists mailing_intents_updated_at on public.mailing_intents;
create trigger mailing_intents_updated_at
  before update on public.mailing_intents
  for each row execute function public.mailing_intents_set_updated_at();

drop trigger if exists mailing_intents_prevent_user_change on public.mailing_intents;
create function public.prevent_mailing_intent_user_change()
returns trigger language plpgsql as $$
begin
  if new.user_id is distinct from old.user_id then
    raise exception 'Cannot change mailing intent owner';
  end if;
  return new;
end;
$$;
create trigger mailing_intents_prevent_user_change
  before update on public.mailing_intents
  for each row execute function public.prevent_mailing_intent_user_change();
