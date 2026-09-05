-- End users may read their own quotes but must never choose a stored price or
-- payment status through the Data API. Quote issuance is a trusted operation.
drop policy if exists quotes_insert_policy on public.pricing_quotes;
revoke all on public.pricing_quotes from anon, authenticated;
grant select on public.pricing_quotes to authenticated;
grant all on public.pricing_quotes to service_role;

revoke all on public.entitlements_audit_log from anon, authenticated;
grant select on public.entitlements_audit_log to authenticated;
grant select, insert on public.entitlements_audit_log to service_role;

-- The original membership SELECT policy queried itself, causing recursive RLS
-- evaluation. Entitlement lookup only needs the caller's own membership rows.
drop policy if exists members_select_policy on public.organization_members;
create policy members_select_policy on public.organization_members
  for select to authenticated using (user_id = (select auth.uid()));

grant select on public.organizations, public.organization_members,
  public.entitlement_policies, public.entitlement_assignments,
  public.pricing_profiles to authenticated;
grant all on public.organizations, public.organization_members,
  public.entitlement_policies, public.entitlement_assignments,
  public.pricing_profiles to service_role;
revoke execute on function public.get_user_entitlements(uuid) from public, anon;
grant execute on function public.get_user_entitlements(uuid) to authenticated, service_role;

-- Packet approvals and analysis records are trusted outputs of the secure
-- workflow worker. A bearer user session may request them through the API, but
-- must never invoke the SECURITY DEFINER write RPCs directly with forged data.
revoke execute on function public.approve_case_packet(uuid, text, jsonb, integer, integer, jsonb, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.approve_case_packet(uuid, text, jsonb, integer, integer, jsonb, text, jsonb)
  to service_role;
revoke execute on function public.record_case_analysis(uuid, uuid, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.record_case_analysis(uuid, uuid, text, jsonb)
  to service_role;

-- Curating a packet may only change inclusion and ordering. Ownership and the
-- attached document identity are immutable after the insert authorization.
drop policy if exists "owners curate their case documents" on public.case_documents;
create policy "owners curate inclusion and order only"
  on public.case_documents for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create or replace function public.prevent_case_document_retarget()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if new.case_id <> old.case_id or new.document_id <> old.document_id or new.owner_id <> old.owner_id
    then raise exception 'case document identity is immutable';
  end if;
  return new;
end; $$;
drop trigger if exists case_documents_identity_immutable on public.case_documents;
create trigger case_documents_identity_immutable
  before update on public.case_documents for each row
  execute function public.prevent_case_document_retarget();

-- The packet function runs with elevated privileges, so repeat both ownership
-- predicates inside the join rather than relying on caller RLS.
create or replace function public.case_packet_documents(p_case_id uuid)
returns table (
  document_id uuid, role text, evidence_kind text, page_count integer,
  position integer, sha256 text, storage_path text, safe_filename text, mime_type text
)
language plpgsql security definer set search_path = public
as $$
declare v_owner uuid; v_blocked integer;
begin
  select c.owner_id into v_owner from public.workflow_cases c where c.id = p_case_id;
  if v_owner is null or (auth.uid() is not null and v_owner <> auth.uid()) then raise exception 'case not found' using errcode = 'no_data_found'; end if;
  select count(*) into v_blocked from public.case_documents cd
    join public.secure_documents d on d.id = cd.document_id and d.owner_id = v_owner
    where cd.case_id = p_case_id and cd.owner_id = v_owner and cd.included
      and (d.security_status <> 'clean' or d.deleted_at is not null or d.deletion_requested_at is not null);
  if v_blocked > 0 then raise exception 'packet contains % document(s) that have not cleared security scanning', v_blocked; end if;
  if not exists (select 1 from public.case_documents cd where cd.case_id = p_case_id and cd.owner_id = v_owner and cd.role = 'subject_notice' and cd.included)
    then raise exception 'case has no subject notice'; end if;
  return query select cd.document_id, cd.role, cd.evidence_kind, cd.page_count, cd.position,
    d.sha256, d.storage_path, d.safe_filename, d.mime_type
    from public.case_documents cd join public.secure_documents d on d.id = cd.document_id and d.owner_id = v_owner
    where cd.case_id = p_case_id and cd.owner_id = v_owner and cd.included
    order by (cd.role <> 'subject_notice'), cd.position, cd.created_at;
end; $$;
revoke all on function public.case_packet_documents(uuid) from public, anon, authenticated;
grant execute on function public.case_packet_documents(uuid) to service_role;
