-- MailMyPDF Business persistence layer
-- Provider-neutral domain tables; designed for Postgres/Supabase.

create extension if not exists pgcrypto;

create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null default 'America/Los_Angeles',
  created_at timestamptz not null default now()
);

create table if not exists business_members (
  business_id uuid not null references businesses(id) on delete cascade,
  user_id uuid not null,
  role text not null check (role in ('owner','admin','member','viewer')),
  created_at timestamptz not null default now(),
  primary key (business_id, user_id)
);

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  company text,
  email text,
  phone text,
  address jsonb not null,
  tags text[] not null default '{}',
  reference_number text,
  created_at timestamptz not null default now()
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  file_name text not null,
  size_bytes bigint not null default 0,
  content_type text not null,
  page_count integer not null default 0,
  sha256 text,
  storage_path text not null,
  source text not null check (source in ('upload','generated','template')),
  template_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists templates (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  description text,
  body text not null,
  variables jsonb not null default '[]',
  default_mail_class text not null default 'standard' check (default_mail_class in ('standard','certified','registered')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists schedules (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  trigger jsonb not null,
  actions jsonb not null default '[]',
  status text not null default 'draft' check (status in ('active','paused','draft')),
  next_run_at timestamptz,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists mail_jobs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  schedule_id uuid references schedules(id) on delete set null,
  recipient_id uuid not null references contacts(id),
  document_id uuid not null references documents(id),
  lookup_token text not null unique,
  status text not null default 'draft',
  mail_class text not null default 'standard' check (mail_class in ('standard','certified','registered')),
  color boolean not null default false,
  scheduled_at timestamptz,
  submitted_at timestamptz,
  delivered_at timestamptz,
  tracking jsonb,
  proof_of_mailing jsonb,
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists schedule_runs (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references schedules(id) on delete cascade,
  mail_job_id uuid references mail_jobs(id) on delete set null,
  scheduled_for timestamptz not null,
  status text not null default 'pending' check (status in ('pending','running','awaiting_approval','completed','failed','cancelled')),
  idempotency_key text not null unique,
  trigger_run_id text,
  started_at timestamptz,
  completed_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);

create table if not exists approvals (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  mail_job_id uuid not null references mail_jobs(id) on delete cascade,
  requested_by uuid,
  decided_by uuid,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  note text
);

create table if not exists tracking_events (
  id uuid primary key default gen_random_uuid(),
  mail_job_id uuid not null references mail_jobs(id) on delete cascade,
  event_type text not null,
  carrier text not null,
  tracking_number text not null,
  timestamp timestamptz not null,
  location text,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  unique (mail_job_id, event_type, timestamp)
);

create table if not exists audit_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  mail_job_id uuid references mail_jobs(id) on delete cascade,
  event_type text not null,
  actor_type text not null,
  actor_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists schedules_due_idx on schedules(status, next_run_at);
create index if not exists schedule_runs_due_idx on schedule_runs(status, scheduled_for);
create index if not exists mail_jobs_business_idx on mail_jobs(business_id, created_at desc);
create index if not exists mail_jobs_schedule_idx on mail_jobs(schedule_id, scheduled_at);
create index if not exists tracking_events_job_idx on tracking_events(mail_job_id, timestamp desc);
create index if not exists audit_events_job_idx on audit_events(mail_job_id, created_at desc);

create or replace function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists schedules_set_updated_at on schedules;
create trigger schedules_set_updated_at before update on schedules
for each row execute function set_updated_at();

drop trigger if exists mail_jobs_set_updated_at on mail_jobs;
create trigger mail_jobs_set_updated_at before update on mail_jobs
for each row execute function set_updated_at();
