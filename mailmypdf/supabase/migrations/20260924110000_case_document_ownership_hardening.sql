-- Security Core Closure: bind every case attachment to the same owner as
-- both the workflow case and the secure vault document.
--
-- Earlier RLS correctly checked ownership on INSERT, but authenticated users
-- retained table-wide UPDATE permission on case_documents. A direct PostgREST
-- client could therefore attempt to rewrite identity columns after insertion.
-- This migration makes ownership relationally unforgeable and limits browser
-- updates to the three fields the application legitimately mutates.

begin;

create unique index if not exists workflow_cases_id_owner_uidx
  on public.workflow_cases(id, owner_id);

create unique index if not exists secure_documents_id_owner_uidx
  on public.secure_documents(id, owner_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'case_documents_case_owner_fk'
  ) then
    alter table public.case_documents
      add constraint case_documents_case_owner_fk
      foreign key (case_id, owner_id)
      references public.workflow_cases(id, owner_id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'case_documents_document_owner_fk'
  ) then
    alter table public.case_documents
      add constraint case_documents_document_owner_fk
      foreign key (document_id, owner_id)
      references public.secure_documents(id, owner_id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'case_drafts_case_owner_fk'
  ) then
    alter table public.case_drafts
      add constraint case_drafts_case_owner_fk
      foreign key (case_id, owner_id)
      references public.workflow_cases(id, owner_id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'case_approvals_case_owner_fk'
  ) then
    alter table public.case_approvals
      add constraint case_approvals_case_owner_fk
      foreign key (case_id, owner_id)
      references public.workflow_cases(id, owner_id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'workflow_case_inputs_case_owner_fk'
  ) then
    alter table public.workflow_case_inputs
      add constraint workflow_case_inputs_case_owner_fk
      foreign key (case_id, owner_id)
      references public.workflow_cases(id, owner_id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'case_analyses_case_owner_fk'
  ) then
    alter table public.case_analyses
      add constraint case_analyses_case_owner_fk
      foreign key (case_id, owner_id)
      references public.workflow_cases(id, owner_id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'case_analyses_document_owner_fk'
  ) then
    alter table public.case_analyses
      add constraint case_analyses_document_owner_fk
      foreign key (document_id, owner_id)
      references public.secure_documents(id, owner_id);
  end if;
end
$$;

drop policy if exists "owners curate their case documents" on public.case_documents;
create policy "owners curate their case documents"
  on public.case_documents for update to authenticated
  using (
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
  )
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

-- Remove table-wide UPDATE. The browser may only curate packet inclusion,
-- ordering, and the server-measured page count through its owner-scoped client.
revoke update on public.case_documents from authenticated;
grant update (included, position, page_count) on public.case_documents to authenticated;

-- Fail closed even for privileged callers if the join table is ever corrupted.
create or replace function public.case_packet_documents(p_case_id uuid)
returns table (
  document_id uuid,
  role text,
  evidence_kind text,
  page_count integer,
  "position" integer,
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
  select c.owner_id into v_owner
  from public.workflow_cases c
  where c.id = p_case_id;

  if v_owner is null or (auth.uid() is not null and v_owner <> auth.uid()) then
    raise exception 'case not found' using errcode = 'no_data_found';
  end if;

  if exists (
    select 1
    from public.case_documents cd
    left join public.secure_documents d on d.id = cd.document_id
    where cd.case_id = p_case_id
      and (
        cd.owner_id <> v_owner
        or d.id is null
        or d.owner_id <> v_owner
      )
  ) then
    raise exception 'case document ownership mismatch'
      using errcode = 'raise_exception';
  end if;

  select count(*) into v_blocked
  from public.case_documents cd
  join public.secure_documents d
    on d.id = cd.document_id
   and d.owner_id = v_owner
  where cd.case_id = p_case_id
    and cd.owner_id = v_owner
    and cd.included
    and (
      d.security_status <> 'clean'
      or d.deleted_at is not null
      or d.deletion_requested_at is not null
    );

  if v_blocked > 0 then
    raise exception 'packet contains % document(s) that have not cleared security scanning', v_blocked
      using errcode = 'raise_exception';
  end if;

  if not exists (
    select 1
    from public.case_documents cd
    where cd.case_id = p_case_id
      and cd.owner_id = v_owner
      and cd.role = 'subject_notice'
  ) then
    raise exception 'case has no subject notice' using errcode = 'raise_exception';
  end if;

  return query
  select
    cd.document_id,
    cd.role,
    cd.evidence_kind,
    cd.page_count,
    cd.position,
    d.sha256,
    d.storage_path,
    d.safe_filename,
    d.mime_type
  from public.case_documents cd
  join public.secure_documents d
    on d.id = cd.document_id
   and d.owner_id = v_owner
  where cd.case_id = p_case_id
    and cd.owner_id = v_owner
    and cd.included
  order by (cd.role <> 'subject_notice'), cd.position, cd.created_at;
end;
$$;

revoke all on function public.case_packet_documents(uuid) from public, anon;
grant execute on function public.case_packet_documents(uuid)
  to authenticated, service_role;

commit;
