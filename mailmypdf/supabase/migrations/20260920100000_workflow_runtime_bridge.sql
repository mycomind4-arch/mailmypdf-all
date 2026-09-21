-- Bridges the shared generic workflow-runtime contract (@mailmypdf/workflows,
-- createWorkflowRuntimeRequestHandler) onto the existing secure workflow-case
-- schema, so the new root-level workflow UIs (starting with notice-respond's
-- CP14/CP504/CP2000 workflows) can run through the same Supabase-backed
-- persistence, AI gateway, packet builder, and Stripe/Lob fulfillment already
-- used by the v2 case routes, instead of a second parallel runtime.

begin;

-- The new architecture's notice-response evidence vocabulary
-- (packages/workflows/src/domain-packs/notice-response/profiles.ts) uses
-- account_transcript / prior_correspondence / bank_record. The existing
-- constraint only recognized the older irs_transcript / correspondence /
-- bank_statement labels, so attaching evidence under the new labels failed
-- closed with a misleading "cannot be attached in this role" error.
alter table public.case_documents
  drop constraint if exists case_documents_evidence_kind_check;

alter table public.case_documents
  add constraint case_documents_evidence_kind_check
  check (
    evidence_kind is null
    or evidence_kind in (
      'medical_records',
      'physician_statement',
      'test_results',
      'medication_history',
      'functional_capacity',
      'work_history',
      'prior_decision',
      'correspondence',
      'tax_return',
      'information_return',
      'broker_statement',
      'bank_statement',
      'corrected_tax_document',
      'irs_transcript',
      'payment_record',
      'account_transcript',
      'prior_correspondence',
      'bank_record',
      'other'
    )
  );

-- The generic runtime tracks a "draft basis" fingerprint (analysis version,
-- input version, document-set fingerprint) so a stale draft cannot be carried
-- into a packet after the underlying facts changed. Additive/nullable so
-- existing rows and the existing v2 draft route are unaffected.
alter table public.case_drafts
  add column if not exists basis jsonb;

-- The generic runtime's route handler generates the approval id client-side
-- (returned to the browser as soon as approval succeeds) before the store
-- persists it, so the persisted row must accept that id instead of always
-- minting its own — otherwise a later lookup/checkout by that id would 404.
-- The existing 8-argument call (v2 /approve route) is unaffected: the new
-- parameter defaults to null, which preserves the original auto-generated id.
drop function if exists public.approve_case_packet(
  uuid, text, jsonb, integer, integer, jsonb, text, jsonb
);

create or replace function public.approve_case_packet(
  p_case_id uuid,
  p_packet_sha256 text,
  p_manifest jsonb,
  p_response_pages integer,
  p_supporting_pages integer,
  p_recipient jsonb,
  p_mail_class text,
  p_quote jsonb,
  p_approval_id uuid default null
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
  if v_owner is null or (auth.uid() is not null and v_owner <> auth.uid()) then
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
    id, case_id, owner_id, packet_sha256, manifest, response_pages,
    supporting_pages, recipient, mail_class, quote
  ) values (
    coalesce(p_approval_id, gen_random_uuid()), p_case_id, v_owner, p_packet_sha256, p_manifest, p_response_pages,
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

revoke all on function public.approve_case_packet(uuid, text, jsonb, integer, integer, jsonb, text, jsonb, uuid)
  from public, anon;
grant execute on function public.approve_case_packet(uuid, text, jsonb, integer, integer, jsonb, text, jsonb, uuid)
  to authenticated, service_role;

commit;
