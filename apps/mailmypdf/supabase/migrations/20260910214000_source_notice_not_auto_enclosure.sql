-- Separate the notice used for analysis from documents explicitly enclosed
-- in the outgoing packet. Existing approved/submitted cases are preserved
-- exactly as approved; only mutable cases are normalized.

begin;

update public.case_documents cd
set included = false
from public.workflow_cases c
where cd.case_id = c.id
  and cd.owner_id = c.owner_id
  and cd.role = 'subject_notice'
  and c.status in ('intake', 'analyzed', 'evidence', 'drafted');

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
  select c.owner_id into v_owner
  from public.workflow_cases c
  where c.id = p_case_id;

  if v_owner is null or (auth.uid() is not null and v_owner <> auth.uid()) then
    raise exception 'case not found' using errcode = 'no_data_found';
  end if;

  -- The source notice remains mandatory and must be clean, even though it is
  -- not automatically part of the outgoing packet.
  if not exists (
    select 1
    from public.case_documents cd
    join public.secure_documents d
      on d.id = cd.document_id
     and d.owner_id = v_owner
    where cd.case_id = p_case_id
      and cd.owner_id = v_owner
      and cd.role = 'subject_notice'
      and d.security_status = 'clean'
      and d.deleted_at is null
      and d.deletion_requested_at is null
  ) then
    raise exception 'case has no clean source notice' using errcode = 'raise_exception';
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
    raise exception 'packet contains % document(s) that have not cleared security scanning', v_blocked;
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

revoke all on function public.case_packet_documents(uuid)
  from public, anon, authenticated;
grant execute on function public.case_packet_documents(uuid)
  to service_role;

commit;
