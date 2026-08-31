-- Gold Standard account ownership + payment-first fulfillment for MailMyPDF Business.

create table if not exists mailing_intents (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  requested_by uuid not null,
  workflow_id text not null,
  mail_job_id uuid references mail_jobs(id) on delete set null,
  stripe_session_id text unique,
  stripe_payment_intent_id text,
  status text not null default 'pending',
  mailing_method text not null check (mailing_method in ('standard','certified','registered')),
  draft_content text not null,
  recipient jsonb not null,
  total_cents integer not null check (total_cents > 0),
  provider_order_id text,
  tracking_number text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mailing_intents_business_idx on mailing_intents(business_id, updated_at desc);
create index if not exists mailing_intents_user_idx on mailing_intents(requested_by, updated_at desc);
create index if not exists mailing_intents_provider_idx on mailing_intents(provider_order_id);

-- Tenant boundary: a user can see a business only through an active membership.
create or replace function public.is_business_member(target_business uuid, target_user uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.business_members m
    where m.business_id = target_business and m.user_id = target_user
  );
$$;

alter table businesses enable row level security;
alter table business_members enable row level security;
alter table contacts enable row level security;
alter table documents enable row level security;
alter table templates enable row level security;
alter table schedules enable row level security;
alter table mail_jobs enable row level security;
alter table schedule_runs enable row level security;
alter table approvals enable row level security;
alter table tracking_events enable row level security;
alter table audit_events enable row level security;
alter table mailing_intents enable row level security;

drop policy if exists businesses_member_select on businesses;
create policy businesses_member_select on businesses for select using (public.is_business_member(id, auth.uid()));

drop policy if exists business_members_self_select on business_members;
create policy business_members_self_select on business_members for select using (user_id = auth.uid() or public.is_business_member(business_id, auth.uid()));

drop policy if exists contacts_member_all on contacts;
create policy contacts_member_all on contacts for all using (public.is_business_member(business_id, auth.uid())) with check (public.is_business_member(business_id, auth.uid()));

drop policy if exists documents_member_all on documents;
create policy documents_member_all on documents for all using (public.is_business_member(business_id, auth.uid())) with check (public.is_business_member(business_id, auth.uid()));

drop policy if exists templates_member_all on templates;
create policy templates_member_all on templates for all using (public.is_business_member(business_id, auth.uid())) with check (public.is_business_member(business_id, auth.uid()));

drop policy if exists schedules_member_all on schedules;
create policy schedules_member_all on schedules for all using (public.is_business_member(business_id, auth.uid())) with check (public.is_business_member(business_id, auth.uid()));

drop policy if exists mail_jobs_member_all on mail_jobs;
create policy mail_jobs_member_all on mail_jobs for all using (public.is_business_member(business_id, auth.uid())) with check (public.is_business_member(business_id, auth.uid()));

drop policy if exists schedule_runs_member_all on schedule_runs;
create policy schedule_runs_member_all on schedule_runs for all using (
  exists (select 1 from schedules s where s.id = schedule_runs.schedule_id and public.is_business_member(s.business_id, auth.uid()))
) with check (
  exists (select 1 from schedules s where s.id = schedule_runs.schedule_id and public.is_business_member(s.business_id, auth.uid()))
);

drop policy if exists approvals_member_all on approvals;
create policy approvals_member_all on approvals for all using (public.is_business_member(business_id, auth.uid())) with check (public.is_business_member(business_id, auth.uid()));

drop policy if exists tracking_member_select on tracking_events;
create policy tracking_member_select on tracking_events for select using (
  exists (select 1 from mail_jobs j where j.id = tracking_events.mail_job_id and public.is_business_member(j.business_id, auth.uid()))
);

drop policy if exists audit_member_select on audit_events;
create policy audit_member_select on audit_events for select using (business_id is null or public.is_business_member(business_id, auth.uid()));

drop policy if exists mailing_intents_member_all on mailing_intents;
create policy mailing_intents_member_all on mailing_intents for all using (public.is_business_member(business_id, auth.uid())) with check (public.is_business_member(business_id, auth.uid()) and requested_by = auth.uid());

create or replace function public.set_business_mailing_intent_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists mailing_intents_updated_at on mailing_intents;
create trigger mailing_intents_updated_at before update on mailing_intents for each row execute function public.set_business_mailing_intent_updated_at();

drop trigger if exists mailing_intents_owner_guard on mailing_intents;
create or replace function public.prevent_business_mailing_owner_change()
returns trigger language plpgsql as $$
begin
  if new.requested_by is distinct from old.requested_by or new.business_id is distinct from old.business_id then
    raise exception 'Cannot change mailing intent owner';
  end if;
  return new;
end;
$$;
create trigger mailing_intents_owner_guard before update on mailing_intents for each row execute function public.prevent_business_mailing_owner_change();
