create extension if not exists pgcrypto;

create table if not exists public.dispute_cases (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  workflow_id text not null,
  document_id text not null,
  status text not null check (status in ('draft','validated','review','approved','payment_pending','submitted','tracking','completed','failed','cancelled')),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz,
  submitted_at timestamptz,
  provider_order_id text,
  tracking_number text,
  proof_hash text
);

create index if not exists dispute_cases_owner_idx on public.dispute_cases(owner_id, updated_at desc);
create index if not exists dispute_cases_workflow_idx on public.dispute_cases(owner_id, workflow_id, updated_at desc);
create unique index if not exists dispute_cases_provider_order_idx on public.dispute_cases(provider_order_id) where provider_order_id is not null;

create table if not exists public.dispute_case_evidence (
  id text primary key,
  case_id uuid not null references public.dispute_cases(id) on delete cascade,
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

create index if not exists dispute_case_evidence_case_idx on public.dispute_case_evidence(case_id, status);
create index if not exists dispute_case_evidence_owner_idx on public.dispute_case_evidence(owner_id, updated_at desc);

create table if not exists public.dispute_case_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.dispute_cases(id) on delete cascade,
  owner_id text not null,
  event_type text not null,
  actor_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists dispute_case_events_case_idx on public.dispute_case_events(case_id, created_at desc);
create index if not exists dispute_case_events_owner_idx on public.dispute_case_events(owner_id, created_at desc);

alter table public.dispute_cases enable row level security;
alter table public.dispute_case_evidence enable row level security;
alter table public.dispute_case_events enable row level security;
