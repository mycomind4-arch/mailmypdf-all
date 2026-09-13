-- Step-matter workflows: the generic, linear (non-branching) step engine
-- used by every future straight-line matter workflow in Appeal Mail (see
-- @mailmypdf/step-workflow). No workflows are registered yet — this is
-- one-time plumbing so the engine's tables exist ahead of the first
-- converted workflow. Clients may read their own state, but only
-- authenticated server functions using the service role may mutate it —
-- state transitions go through security-invoker RPCs that enforce the
-- envelope (owner/workflow/version) instead of raw table writes.

create table if not exists public.appeal_mail_step_matters (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  workflow_id text not null,
  version integer not null default 1 check (version > 0),
  state jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appeal_mail_step_state_object_check check (jsonb_typeof(state) = 'object')
);

create index if not exists appeal_mail_step_matters_owner_idx
  on public.appeal_mail_step_matters(owner_id, updated_at desc);
create index if not exists appeal_mail_step_matters_workflow_idx
  on public.appeal_mail_step_matters(owner_id, workflow_id, updated_at desc);

create table if not exists public.appeal_mail_step_events (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.appeal_mail_step_matters(id) on delete cascade,
  owner_id uuid not null,
  event_type text not null check (
    event_type in (
      'step_matter_created',
      'step_matter_step_updated',
      'step_matter_checklist_updated',
      'step_matter_step_completed',
      'step_matter_approved'
    )
  ),
  actor_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint appeal_mail_step_event_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

create index if not exists appeal_mail_step_events_matter_idx
  on public.appeal_mail_step_events(matter_id, created_at asc);
create index if not exists appeal_mail_step_events_owner_idx
  on public.appeal_mail_step_events(owner_id, created_at desc);

alter table public.appeal_mail_step_matters enable row level security;
alter table public.appeal_mail_step_events enable row level security;

drop policy if exists appeal_mail_step_matters_select_own
  on public.appeal_mail_step_matters;
create policy appeal_mail_step_matters_select_own
  on public.appeal_mail_step_matters
  for select
  to authenticated
  using (auth.uid() = owner_id);

drop policy if exists appeal_mail_step_events_select_own
  on public.appeal_mail_step_events;
create policy appeal_mail_step_events_select_own
  on public.appeal_mail_step_events
  for select
  to authenticated
  using (auth.uid() = owner_id);

create or replace function public.appeal_mail_step_matters_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists appeal_mail_step_matters_updated_at
  on public.appeal_mail_step_matters;
create trigger appeal_mail_step_matters_updated_at
  before update on public.appeal_mail_step_matters
  for each row execute function public.appeal_mail_step_matters_set_updated_at();

create or replace function public.prevent_appeal_mail_step_envelope_change()
returns trigger language plpgsql as $$
begin
  if new.owner_id is distinct from old.owner_id then
    raise exception 'Cannot change step matter owner';
  end if;
  if new.workflow_id is distinct from old.workflow_id then
    raise exception 'Cannot change step matter workflow';
  end if;
  if new.id is distinct from old.id then
    raise exception 'Cannot change step matter id';
  end if;
  return new;
end;
$$;

drop trigger if exists appeal_mail_step_envelope_guard
  on public.appeal_mail_step_matters;
create trigger appeal_mail_step_envelope_guard
  before update on public.appeal_mail_step_matters
  for each row execute function public.prevent_appeal_mail_step_envelope_change();

create or replace function public.appeal_mail_create_step_matter(
  p_id uuid,
  p_owner_id uuid,
  p_workflow_id text,
  p_state jsonb,
  p_actor_id text
)
returns setof public.appeal_mail_step_matters
language plpgsql
security invoker
set search_path = ''
as $$
declare
  created public.appeal_mail_step_matters%rowtype;
begin
  if p_state->>'id' is distinct from p_id::text then
    raise exception 'state id does not match row id';
  end if;
  if p_state->>'ownerId' is distinct from p_owner_id::text then
    raise exception 'state owner does not match row owner';
  end if;
  if p_state->>'workflowId' is distinct from p_workflow_id then
    raise exception 'state workflow does not match row workflow';
  end if;
  if coalesce((p_state->>'version')::integer, 0) <> 1 then
    raise exception 'new step matter state must begin at version 1';
  end if;

  insert into public.appeal_mail_step_matters (
    id, owner_id, workflow_id, version, state
  )
  values (
    p_id, p_owner_id, p_workflow_id, 1, p_state
  )
  returning * into created;

  insert into public.appeal_mail_step_events (
    matter_id, owner_id, event_type, actor_id, metadata
  )
  values (
    p_id,
    p_owner_id,
    'step_matter_created',
    p_actor_id,
    jsonb_build_object('workflowId', p_workflow_id)
  );

  return next created;
end;
$$;

create or replace function public.appeal_mail_commit_step_state(
  p_matter_id uuid,
  p_owner_id uuid,
  p_expected_version integer,
  p_state jsonb,
  p_event_type text,
  p_actor_id text,
  p_metadata jsonb
)
returns setof public.appeal_mail_step_matters
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_workflow text;
  updated public.appeal_mail_step_matters%rowtype;
begin
  select workflow_id
    into current_workflow
  from public.appeal_mail_step_matters
  where id = p_matter_id
    and owner_id = p_owner_id
    and version = p_expected_version
  for update;

  if not found then
    return;
  end if;

  if p_state->>'id' is distinct from p_matter_id::text then
    raise exception 'state id does not match row id';
  end if;
  if p_state->>'ownerId' is distinct from p_owner_id::text then
    raise exception 'state owner does not match row owner';
  end if;
  if p_state->>'workflowId' is distinct from current_workflow then
    raise exception 'state workflow does not match row workflow';
  end if;
  if coalesce((p_state->>'version')::integer, 0) <> p_expected_version + 1 then
    raise exception 'state version must advance by exactly one';
  end if;
  if p_event_type not in (
    'step_matter_step_updated',
    'step_matter_checklist_updated',
    'step_matter_step_completed',
    'step_matter_approved'
  ) then
    raise exception 'unsupported step matter event type';
  end if;
  if jsonb_typeof(coalesce(p_metadata, '{}'::jsonb)) <> 'object' then
    raise exception 'step matter event metadata must be an object';
  end if;

  update public.appeal_mail_step_matters
  set
    version = p_expected_version + 1,
    state = p_state,
    updated_at = now()
  where id = p_matter_id
    and owner_id = p_owner_id
    and version = p_expected_version
  returning * into updated;

  if not found then
    return;
  end if;

  insert into public.appeal_mail_step_events (
    matter_id, owner_id, event_type, actor_id, metadata
  )
  values (
    p_matter_id,
    p_owner_id,
    p_event_type,
    p_actor_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return next updated;
end;
$$;

revoke all on function public.appeal_mail_create_step_matter(
  uuid, uuid, text, jsonb, text
) from public, anon, authenticated;
grant execute on function public.appeal_mail_create_step_matter(
  uuid, uuid, text, jsonb, text
) to service_role;

revoke all on function public.appeal_mail_commit_step_state(
  uuid, uuid, integer, jsonb, text, text, jsonb
) from public, anon, authenticated;
grant execute on function public.appeal_mail_commit_step_state(
  uuid, uuid, integer, jsonb, text, text, jsonb
) to service_role;
