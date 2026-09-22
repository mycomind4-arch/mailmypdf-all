-- Accepts the evidence kinds that the executable shared-runtime workflows
-- actually send. Until now the constraint only knew the SSDI and older IRS
-- labels (not the IRS penalty workflow's reasonable-cause/filing/advice records),
-- so attaching an insurance-appeal record, an official SSA form (SSA-561,
-- SSA-3441, SSA-827), an SSI eligibility record, an immigration packet
-- document, or a records-request context document failed closed.
-- Additive: every previously accepted kind is still accepted.
-- tests/evidence-kind-coverage.test.ts keeps this list, the app allowlist
-- (src/lib/secure-core/case.server.ts EVIDENCE_KINDS) and each workflow's
-- own vocabulary in step.

begin;

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
      'reasonable_cause_record',
      'filing_proof',
      'written_irs_advice',
      'ssa_561',
      'ssa_3441',
      'ssa_827',
      'income_resources',
      'living_arrangement',
      'identity_eligibility',
      'policy_or_plan',
      'claim_submission',
      'supporting_record',
      'receipt_or_invoice',
      'expert_statement',
      'filing_form',
      'supporting_evidence',
      'identity_document',
      'prior_notice',
      'receipt_notice',
      'payment_evidence',
      'notice',
      'case_correspondence',
      'incident_reference',
      'permit_record',
      'property_record',
      'screenshot',
      'prior_request',
      'prior_response',
      'other'
    )
  );

commit;
