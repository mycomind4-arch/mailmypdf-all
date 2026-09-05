-- Versioned, owner-scoped facts supplied by a person during a workflow.
-- These are separate from model analysis so user assertions never become
-- indistinguishable from extracted notice facts.

create table if not exists public.workflow_case_inputs (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.workflow_cases(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  version integer not null check (version >= 1),
  input jsonb not null check (jsonb_typeof(input) = 'object'),
  created_at timestamptz not null default now(),
  unique (case_id, version)
);

create index if not exists workflow_case_inputs_case_idx
  on public.workflow_case_inputs(case_id, version desc);

alter table public.workflow_case_inputs enable row level security;

create policy "owners write their case inputs"
  on public.workflow_case_inputs for insert to authenticated
  with check (
    owner_id = auth.uid()
    and exists (
      select 1 from public.workflow_cases c
      where c.id = case_id and c.owner_id = auth.uid()
    )
  );

create policy "owners read their case inputs"
  on public.workflow_case_inputs for select to authenticated
  using (owner_id = auth.uid());

revoke all on public.workflow_case_inputs from anon;
grant select, insert on public.workflow_case_inputs to authenticated;

create trigger workflow_case_inputs_immutable
  before update or delete on public.workflow_case_inputs
  for each row execute function public.reject_immutable_security_records();
