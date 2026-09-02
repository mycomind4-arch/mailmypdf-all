-- ─────────────────────────────────────────────────────────────────────────
-- Capability Graph State — User life state persistence
--
-- Stores the user's completed capabilities, in-progress capabilities,
-- and reached milestones. Derived from authoritative workflow/state events.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.user_capability_state (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null unique,
  completed_capabilities text[] not null default '{}'::text[],
  in_progress_capabilities text[] not null default '{}'::text[],
  reached_milestones text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_capability_state_owner_idx on public.user_capability_state(owner_id);
alter table public.user_capability_state enable row level security;
drop policy if exists user_capability_state_select_own on public.user_capability_state;
create policy user_capability_state_select_own on public.user_capability_state for select using (auth.uid()::text = owner_id);
drop policy if exists user_capability_state_insert_own on public.user_capability_state;
drop policy if exists user_capability_state_update_own on public.user_capability_state;
drop policy if exists user_capability_state_delete_own on public.user_capability_state;
drop trigger if exists user_capability_state_updated_at on public.user_capability_state;
create trigger user_capability_state_updated_at before update on public.user_capability_state for each row execute function public.set_private_office_updated_at();

create table if not exists public.user_capability_events (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  event_type text not null check (event_type in ('capability_started','capability_completed','milestone_reached','milestone_unlocked','workflow_group_unlocked')),
  capability_id text,
  milestone_id text,
  workflow_group_id text,
  matter_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.user_capability_events add column if not exists workflow_group_id text;
alter table public.user_capability_events add column if not exists matter_id text;
create index if not exists user_capability_events_owner_idx on public.user_capability_events(owner_id, created_at desc);
create index if not exists user_capability_events_matter_idx on public.user_capability_events(matter_id, created_at desc);
alter table public.user_capability_events enable row level security;
drop policy if exists user_capability_events_select_own on public.user_capability_events;
create policy user_capability_events_select_own on public.user_capability_events for select using (auth.uid()::text = owner_id);
drop policy if exists user_capability_events_insert_own on public.user_capability_events;

do $$
begin
  if exists (select 1 from pg_constraint where conrelid = 'public.user_capability_events'::regclass and conname = 'user_capability_events_event_type_check') then
    alter table public.user_capability_events drop constraint user_capability_events_event_type_check;
  end if;
exception when undefined_table then null;
end $$;

alter table public.user_capability_events add constraint user_capability_events_event_type_check check (event_type in ('capability_started','capability_completed','milestone_reached','milestone_unlocked','workflow_group_unlocked'));
