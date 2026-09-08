-- Add approvals table and missing columns for hardened fulfillment workflow

-- Create approvals table for server-side approval records
create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  workflow_id text not null,
  case_id uuid references public.dispute_cases(id) on delete cascade,
  draft text not null,
  recipient jsonb not null,
  draft_hash text not null, -- SHA-256 hash of draft for verification during fulfillment
  recipient_hash text not null, -- SHA-256 hash of recipient for verification during fulfillment
  status text not null default 'active', -- 'active' | 'used' | 'revoked'
  approved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists approvals_owner_idx on public.approvals(owner_id, status, updated_at desc);
create index if not exists approvals_workflow_idx on public.approvals(workflow_id, owner_id);
create index if not exists approvals_draft_hash_idx on public.approvals(draft_hash);

alter table public.approvals enable row level security;

-- Approvals are owner-scoped
drop policy if exists approvals_select_own on public.approvals;
create policy approvals_select_own on public.approvals for select using (auth.uid()::text = owner_id);
drop policy if exists approvals_insert_own on public.approvals;
create policy approvals_insert_own on public.approvals for insert with check (auth.uid()::text = owner_id);
drop policy if exists approvals_update_own on public.approvals;
create policy approvals_update_own on public.approvals for update using (auth.uid()::text = owner_id) with check (auth.uid()::text = owner_id);

-- Add missing columns to mailing_intents
alter table public.mailing_intents add column if not exists approval_id uuid references public.approvals(id) on delete restrict;
alter table public.mailing_intents add column if not exists approved_draft_hash text;
alter table public.mailing_intents add column if not exists approved_recipient_hash text;
alter table public.mailing_intents add column if not exists quote_snapshot jsonb;
alter table public.mailing_intents add column if not exists draft text;
alter table public.mailing_intents add column if not exists recipient jsonb;

-- Fix status default and add constraint for valid statuses
alter table public.mailing_intents alter column status set default 'draft';

-- Add check constraint for mailing_method to ensure it's a valid MailType
-- Valid values: 'first_class' | 'certified' | 'certified_return_receipt' | 'registered'
alter table public.mailing_intents add constraint mailing_method_valid check (mailing_method in ('first_class', 'certified', 'certified_return_receipt', 'registered'));
