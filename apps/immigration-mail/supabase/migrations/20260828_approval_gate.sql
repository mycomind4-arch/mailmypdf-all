-- ═══════════════════════════════════════════════════════════
-- APPROVAL GATE — Server-side consequential-action boundary
-- Gold Hardening Program P0 fix #2: Immigration Mail
-- ═══════════════════════════════════════════════════════════

create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  case_id text not null,
  workflow_id text not null,
  draft_hash text not null,
  recipient_hash text not null,
  draft_content text not null,
  recipient jsonb not null,
  review_state jsonb not null,
  approved_at timestamptz not null default now(),
  revoked_at timestamptz,
  status text not null default 'active'
);

create index if not exists approvals_user_id_idx on public.approvals(user_id);
create index if not exists approvals_case_id_idx on public.approvals(case_id);
create index if not exists approvals_status_idx on public.approvals(status);

alter table public.approvals enable row level security;

drop policy if exists approvals_select_own on public.approvals;
create policy approvals_select_own on public.approvals
  for select using (auth.uid() = user_id);

drop policy if exists approvals_insert_own on public.approvals;
create policy approvals_insert_own on public.approvals
  for insert with check (auth.uid() = user_id);

-- Add approval reference to mailing_intents
alter table public.mailing_intents add column if not exists approval_id uuid references public.approvals(id);
alter table public.mailing_intents add column if not exists approved_draft_hash text;
alter table public.mailing_intents add column if not exists approved_recipient_hash text;
