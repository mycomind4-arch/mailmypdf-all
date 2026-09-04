-- Workflow cases and evidence packets on the secure document core.
--
-- The secure document vault owns individual files. Nothing owned a *matter*:
-- the notice being responded to, the supporting evidence a user chose to send
-- with it, and the exact packet they approved. Without that layer a workflow
-- could charge for supporting pages it never collected, and fulfillment could
-- mail a letter while claiming attachments went with it.
--
-- Invariants enforced here rather than in application code:
--   1. A case, its documents and its approval share one owner.
--   2. A case holds at most one subject notice.
--   3. Evidence must declare what kind of evidence it is.
--   4. Only a scanned-clean, undeleted document may be included in a packet.
--   5. Approval is immutable and binds the packet hash, the ordered document
--      manifest, the recipient, the mail class and the server-calculated quote.

create table if not exists public.workflow_cases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  workflow_id text not null check (length(workflow_id) between 1 and 128),
  vertical_id text not null check (length(vertical_id) between 1 and 128),
  status text not null default 'intake'
    check (status in ('intake', 'analyzed', 'evidence', 'drafted', 'approved', 'submitted', 'abandoned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.case_documents (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.workflow_cases(id) on delete cascade,
  document_id uuid not null references public.secure_documents(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('subject_notice', 'evidence')),
  evidence_kind text check (evidence_kind in (
    'medical_records', 'physician_statement', 'test_results', 'medication_history',
    'functional_capacity', 'work_history', 'prior_decision', 'correspondence', 'other'
  )),
  page_count integer check (page_count is null or (page_count between 1 and 500)),
  included boolean not null default true,
  position integer not null default 0 check (position between 0 and 500),
  created_at timestamptz not null default now(),
  unique (case_id, document_id),
  constraint evidence_declares_its_kind check (role <> 'evidence' or evidence_kind is not null),
  constraint subject_notice_has_no_evidence_kind check (role <> 'subject_notice' or evidence_kind is null)
);

-- A case responds to exactly one notice.
create unique index if not exists case_documents_single_subject_notice_idx
  on public.case_documents(case_id) where role = 'subject_notice';

create table if not exists public.case_drafts (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.workflow_cases(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  version integer not null check (version >= 1),
  body_text text not null check (length(body_text) between 1 and 100000),
  created_at timestamptz not null default now(),
  unique (case_id, version)
);

create table if not exists public.case_approvals (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.workflow_cases(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  packet_sha256 text not null check (packet_sha256 ~ '^[0-9a-f]{64}$'),
  manifest jsonb not null,
  response_pages integer not null check (response_pages between 1 and 500),
  supporting_pages integer not null check (supporting_pages between 0 and 500),
  recipient jsonb not null,
  mail_class text not null check (mail_class in ('standard', 'certified', 'registered')),
  quote jsonb not null,
  approved_at timestamptz not null default now()
);

create index if not exists workflow_cases_owner_idx
  on public.workflow_cases(owner_id, workflow_id, created_at desc);
create index if not exists case_documents_case_idx
  on public.case_documents(case_id, role, position);
create index if not exists case_approvals_case_idx
  on public.case_approvals(case_id, approved_at desc);

alter table public.workflow_cases enable row level security;
alter table public.case_documents enable row level security;
alter table public.case_drafts enable row level security;
alter table public.case_approvals enable row level security;

create policy "owners create their cases"
  on public.workflow_cases for insert to authenticated
  with check (owner_id = auth.uid());
create policy "owners read their cases"
  on public.workflow_cases for select to authenticated
  using (owner_id = auth.uid());
create policy "owners advance their cases"
  on public.workflow_cases for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Attaching a document proves ownership of both sides of the join, and refuses
-- documents the scanner has rejected or the retention worker is purging.
create policy "owners attach their own documents to their own cases"
  on public.case_documents for insert to authenticated
  with check (
    owner_id = auth.uid()
    and exists (
      select 1 from public.workflow_cases c
      where c.id = case_id and c.owner_id = auth.uid()
    )
    and exists (
      select 1 from public.secure_documents d
      where d.id = document_id
        and d.owner_id = auth.uid()
        and d.deleted_at is null
        and d.deletion_requested_at is null
        and d.security_status in ('quarantined', 'scanning', 'clean')
    )
  );
create policy "owners read their case documents"
  on public.case_documents for select to authenticated
  using (owner_id = auth.uid());
-- Include/exclude and ordering are the user's to change; ownership is not.
create policy "owners curate their case documents"
  on public.case_documents for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owners detach their case documents"
  on public.case_documents for delete to authenticated
  using (owner_id = auth.uid());

create policy "owners write their drafts"
  on public.case_drafts for insert to authenticated
  with check (
    owner_id = auth.uid()
    and exists (select 1 from public.workflow_cases c where c.id = case_id and c.owner_id = auth.uid())
  );
create policy "owners read their drafts"
  on public.case_drafts for select to authenticated
  using (owner_id = auth.uid());

create policy "owners read their approvals"
  on public.case_approvals for select to authenticated
  using (owner_id = auth.uid());

-- Approvals are written by a server operation that recalculates the packet and
-- the price. A browser session may read them but never manufacture one.
revoke all on public.case_approvals from anon, authenticated;
grant select on public.case_approvals to authenticated;
revoke all on public.workflow_cases from anon;
revoke all on public.case_documents from anon;
revoke all on public.case_drafts from anon;
grant select, insert, update on public.workflow_cases to authenticated;
grant select, insert, update, delete on public.case_documents to authenticated;
grant select, insert on public.case_drafts to authenticated;

create trigger case_drafts_immutable
  before update or delete on public.case_drafts
  for each row execute function public.reject_immutable_security_records();

create trigger case_approvals_immutable
  before update or delete on public.case_approvals
  for each row execute function public.reject_immutable_security_records();

create or replace function public.touch_workflow_case()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger workflow_cases_touch
  before update on public.workflow_cases
  for each row execute function public.touch_workflow_case();

-- ── The packet gate ────────────────────────────────────────────────────────
--
-- Returns the documents that may enter a mailed packet, in order, and refuses
-- the whole case if any included document has not cleared malware scanning or
-- is being purged. Callers cannot assemble a packet around a document the
-- scanner has not released, because there is no other way to obtain the list.

create or replace function public.case_packet_documents(p_case_id uuid)
returns table (
  document_id uuid,
  role text,
  evidence_kind text,
  page_count integer,
  position integer,
  sha256 text,
  storage_path text,
  safe_filename text,
  mime_type text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_blocked integer;
begin
  select c.owner_id into v_owner from public.workflow_cases c where c.id = p_case_id;
  if v_owner is null or v_owner <> auth.uid() then
    raise exception 'case not found' using errcode = 'no_data_found';
  end if;

  select count(*) into v_blocked
  from public.case_documents cd
  join public.secure_documents d on d.id = cd.document_id
  where cd.case_id = p_case_id
    and cd.included
    and (d.security_status <> 'clean' or d.deleted_at is not null or d.deletion_requested_at is not null);

  if v_blocked > 0 then
    raise exception 'packet contains % document(s) that have not cleared security scanning', v_blocked
      using errcode = 'raise_exception';
  end if;

  if not exists (
    select 1 from public.case_documents cd
    where cd.case_id = p_case_id and cd.role = 'subject_notice'
  ) then
    raise exception 'case has no subject notice' using errcode = 'raise_exception';
  end if;

  return query
  select cd.document_id, cd.role, cd.evidence_kind, cd.page_count, cd.position,
         d.sha256, d.storage_path, d.safe_filename, d.mime_type
  from public.case_documents cd
  join public.secure_documents d on d.id = cd.document_id
  where cd.case_id = p_case_id and cd.included
  order by (cd.role <> 'subject_notice'), cd.position, cd.created_at;
end;
$$;

revoke all on function public.case_packet_documents(uuid) from public, anon;
grant execute on function public.case_packet_documents(uuid) to authenticated, service_role;

-- ── Approval ───────────────────────────────────────────────────────────────
--
-- Binds an approval to the packet the user actually saw. The supporting page
-- count is recomputed from the included evidence rather than trusted from the
-- caller, so a client cannot approve a three-page packet and be billed — or
-- have mailed — something else.

create or replace function public.approve_case_packet(
  p_case_id uuid,
  p_packet_sha256 text,
  p_manifest jsonb,
  p_response_pages integer,
  p_supporting_pages integer,
  p_recipient jsonb,
  p_mail_class text,
  p_quote jsonb
)
returns public.case_approvals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_actual_supporting integer;
  v_approval public.case_approvals;
begin
  select c.owner_id into v_owner from public.workflow_cases c where c.id = p_case_id;
  if v_owner is null or v_owner <> auth.uid() then
    raise exception 'case not found' using errcode = 'no_data_found';
  end if;

  -- Re-runs the packet gate: an approval cannot outrun malware scanning.
  perform 1 from public.case_packet_documents(p_case_id);

  select coalesce(sum(cd.page_count), 0) into v_actual_supporting
  from public.case_documents cd
  where cd.case_id = p_case_id and cd.included;

  if v_actual_supporting <> p_supporting_pages then
    raise exception 'supporting page count % does not match the % page(s) actually included',
      p_supporting_pages, v_actual_supporting using errcode = 'raise_exception';
  end if;

  insert into public.case_approvals (
    case_id, owner_id, packet_sha256, manifest, response_pages,
    supporting_pages, recipient, mail_class, quote
  ) values (
    p_case_id, v_owner, p_packet_sha256, p_manifest, p_response_pages,
    v_actual_supporting, p_recipient, p_mail_class, p_quote
  )
  returning * into v_approval;

  update public.workflow_cases set status = 'approved' where id = p_case_id;

  insert into public.security_events (owner_id, event_type, metadata)
  values (v_owner, 'case.packet_approved', jsonb_build_object(
    'case_id', p_case_id,
    'packet_sha256', p_packet_sha256,
    'response_pages', p_response_pages,
    'supporting_pages', v_actual_supporting,
    'mail_class', p_mail_class
  ));

  return v_approval;
end;
$$;

revoke all on function public.approve_case_packet(uuid, text, jsonb, integer, integer, jsonb, text, jsonb)
  from public, anon;
grant execute on function public.approve_case_packet(uuid, text, jsonb, integer, integer, jsonb, text, jsonb)
  to authenticated, service_role;

create index if not exists case_drafts_case_idx
  on public.case_drafts(case_id, version desc);
