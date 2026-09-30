-- Persistent supervised workflow-factory jobs.
-- Server/admin only: RLS is enabled and no browser/client policies are granted.
-- The durable JSON snapshot is versioned by @mailmypdf/workflows; indexed columns
-- exist only for queueing and inspection. Publication remains explicitly reviewed.

begin;

create table if not exists public.factory_jobs (
  id uuid primary key default gen_random_uuid(),
  schema_version text not null default 'mailmypdf.factory-job/v1',
  revision integer not null default 1 check (revision > 0),
  status text not null check (
    status in ('queued', 'running', 'awaiting_review', 'completed', 'failed', 'cancelled')
  ),
  stage text not null check (
    stage in (
      'intake',
      'match',
      'certify',
      'template_review',
      'build',
      'acceptance',
      'publication_review',
      'complete'
    )
  ),
  selected_workflow_id text,
  problem text not null check (char_length(problem) between 1 and 4000),
  job_json jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint factory_jobs_snapshot_object check (jsonb_typeof(job_json) = 'object')
);

create index if not exists factory_jobs_status_updated_idx
  on public.factory_jobs (status, updated_at desc);

create index if not exists factory_jobs_stage_updated_idx
  on public.factory_jobs (stage, updated_at desc);

create table if not exists public.factory_job_events (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.factory_jobs(id) on delete cascade,
  revision integer not null check (revision > 0),
  event_type text not null,
  from_stage text,
  to_stage text not null,
  data jsonb not null default '{}'::jsonb,
  actor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint factory_job_events_data_object check (jsonb_typeof(data) = 'object'),
  constraint factory_job_events_job_revision_unique unique (job_id, revision)
);

create index if not exists factory_job_events_job_created_idx
  on public.factory_job_events (job_id, created_at asc);

alter table public.factory_jobs enable row level security;
alter table public.factory_job_events enable row level security;

revoke all on table public.factory_jobs from public, anon, authenticated;
revoke all on table public.factory_job_events from public, anon, authenticated;

grant select, insert, update, delete on table public.factory_jobs to service_role;
grant select, insert, update, delete on table public.factory_job_events to service_role;

comment on table public.factory_jobs is
  'Durable admin-only supervised workflow-factory jobs. job_json is the canonical versioned state snapshot; consequential publication is never implicit.';

comment on table public.factory_job_events is
  'Append-only factory job transition history keyed by the resulting job revision.';

commit;
