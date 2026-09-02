-- Durable, server-owned execution state for the Private Office Workflow Builder.
-- No client policies are created: workflow-building is a consequential,
-- administrator-only operation executed through server functions.

create table if not exists public.private_office_workflow_build_runs (
  id text primary key,
  operator_id text not null,
  idempotency_key text not null unique,
  spec jsonb not null,
  spec_hash text not null,
  status text not null check (status in ('AWAITING_APPROVAL', 'READY_TO_BUILD', 'BUILDING', 'PAUSED_FOR_BUDGET')),
  approval jsonb,
  known_cost_usd numeric not null default 0 check (known_cost_usd >= 0),
  agent_tokens_used bigint not null default 0 check (agent_tokens_used >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists private_office_workflow_build_runs_operator_idx
  on public.private_office_workflow_build_runs(operator_id, updated_at desc);

alter table public.private_office_workflow_build_runs enable row level security;

drop policy if exists private_office_workflow_build_runs_select_own on public.private_office_workflow_build_runs;
drop policy if exists private_office_workflow_build_runs_insert_own on public.private_office_workflow_build_runs;
drop policy if exists private_office_workflow_build_runs_update_own on public.private_office_workflow_build_runs;
drop policy if exists private_office_workflow_build_runs_delete_own on public.private_office_workflow_build_runs;

drop trigger if exists private_office_workflow_build_runs_updated_at on public.private_office_workflow_build_runs;
create trigger private_office_workflow_build_runs_updated_at
  before update on public.private_office_workflow_build_runs
  for each row execute function public.set_private_office_updated_at();
