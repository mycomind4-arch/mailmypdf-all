-- Expand secure workflow evidence taxonomy for IRS notice workflows.
-- Existing SSDI evidence kinds remain valid.

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
      'other'
    )
  );

commit;
