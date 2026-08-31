-- Comprehensive first-party analytics, populated only after explicit analytics consent.
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  event_name text not null,
  occurred_at timestamptz not null default now(),
  visitor_id text,
  session_id text,
  user_id uuid references auth.users(id) on delete set null,
  page text,
  url text,
  referrer text,
  title text,
  properties jsonb not null default '{}'::jsonb,
  technical jsonb not null default '{}'::jsonb,
  attribution jsonb not null default '{}'::jsonb,
  consent_version text not null,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_occurred_at_idx on public.analytics_events (occurred_at desc);
create index if not exists analytics_events_event_name_idx on public.analytics_events (event_name);
create index if not exists analytics_events_visitor_id_idx on public.analytics_events (visitor_id);
create index if not exists analytics_events_session_id_idx on public.analytics_events (session_id);
create index if not exists analytics_events_user_id_idx on public.analytics_events (user_id);

-- Inference records retain the evidence used for each behavioral score.
create table if not exists public.analytics_inferences (
  id uuid primary key default gen_random_uuid(),
  visitor_id text,
  user_id uuid references auth.users(id) on delete set null,
  inference_type text not null,
  value jsonb not null,
  confidence numeric(5,4),
  evidence jsonb not null default '[]'::jsonb,
  model_version text,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists analytics_inferences_visitor_idx on public.analytics_inferences (visitor_id);
create index if not exists analytics_inferences_type_idx on public.analytics_inferences (inference_type);

alter table public.analytics_events enable row level security;
alter table public.analytics_inferences enable row level security;

-- Browser clients must not be able to read analytics or inference data.
drop policy if exists "analytics_events_no_public_read" on public.analytics_events;
drop policy if exists "analytics_inferences_no_public_read" on public.analytics_inferences;
create policy "analytics_events_no_public_read" on public.analytics_events for select using (false);
create policy "analytics_inferences_no_public_read" on public.analytics_inferences for select using (false);

comment on table public.analytics_events is 'Opt-in first-party product analytics. Do not store passwords, payment-card data, document contents, or other sensitive payloads.';
comment on table public.analytics_inferences is 'Behavioral/product inferences with confidence and supporting evidence. Excludes sensitive personal-attribute inference.';
