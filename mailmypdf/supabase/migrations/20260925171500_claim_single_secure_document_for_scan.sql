-- Allow a trusted server path to claim one known owner-scoped document for
-- immediate scanning. This is used by interactive MCP uploads so users do not
-- have to wait for the scheduled batch scanner. The scheduled batch claim
-- remains the retry/fallback path.

begin;

create or replace function public.claim_secure_document_for_scan(
  p_document_id uuid,
  p_owner_id uuid
)
returns setof public.secure_documents
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.secure_documents d
  set security_status = 'scanning',
      scan_attempts = d.scan_attempts + 1,
      last_scan_error = null
  where d.id = p_document_id
    and d.owner_id = p_owner_id
    and d.security_status = 'quarantined'
    and d.scan_attempts < 10
    and d.deleted_at is null
  returning d.*;
end;
$$;

revoke all on function public.claim_secure_document_for_scan(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.claim_secure_document_for_scan(uuid, uuid)
  to service_role;

commit;
