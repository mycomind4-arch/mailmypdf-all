-- Comprehensive first-party opt-in analytics storage for MailMyPDF.
-- Raw analytics are retained separately from customer/order data and are admin-readable only.

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  event_name text not null,
  occurred_at timestamptz not null default now(),
  visitor_id text not null,
  session_id text not null,
  user_id uuid null,
  page text null,
  url text null,
  referrer text null,
  title text null,
  properties jsonb not null default '{}'::jsonb,
  technical jsonb not null default '{}'::jsonb,
  attribution jsonb not null default '{}'::jsonb,
  consent_version text null,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_occurred_at_idx on public.analytics_events (occurred_at desc);
create index if not exists analytics_events_event_name_idx on public.analytics_events (event_name);
create index if not exists analytics_events_visitor_id_idx on public.analytics_events (visitor_id);
create index if not exists analytics_events_session_id_idx on public.analytics_events (session_id);
create index if not exists analytics_events_user_id_idx on public.analytics_events (user_id);

alter table public.analytics_events enable row level security;

-- Events are inserted by the server-side analytics endpoint using the service role.
-- No direct client SELECT/INSERT policy is intentionally provided.

create table if not exists public.analytics_inferences (
  id uuid primary key default gen_random_uuid(),
  visitor_id text not null,
  user_id uuid null,
  inference_type text not null,
  value jsonb not null,
  confidence numeric(5,4) null,
  evidence jsonb not null default '[]'::jsonb,
  model_version text null,
  created_at timestamptz not null default now(),
  expires_at timestamptz null
);

create index if not exists analytics_inferences_visitor_idx on public.analytics_inferences (visitor_id);
create index if not exists analytics_inferences_type_idx on public.analytics_inferences (inference_type);

alter table public.analytics_inferences enable row level security;
