-- Run only against an isolated migrated database. No rows are modified.
\set ON_ERROR_STOP on
begin;
do $$
declare
  approval record;
begin
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'approve_case_packet'
  ) then raise exception 'Workflow approval RPC is missing'; end if;

  for approval in
    select p.oid, p.oid::regprocedure as signature
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in (
      'approve_case_packet', 'record_case_analysis', 'approve_mcp_direct_mail',
      'case_packet_documents', 'claim_secure_document_for_scan',
      'claim_secure_documents_for_scan'
    )
  loop
    if has_function_privilege('authenticated', approval.oid, 'EXECUTE')
      or has_function_privilege('anon', approval.oid, 'EXECUTE') then
      raise exception 'Untrusted caller can execute %', approval.signature;
    end if;
    if not has_function_privilege('service_role', approval.oid, 'EXECUTE') then
      raise exception 'Trusted server cannot execute %', approval.signature;
    end if;
  end loop;
end $$;
rollback;
\echo 'PASS: all trusted approval, analysis, packet and scanner RPC overloads are server-only'
