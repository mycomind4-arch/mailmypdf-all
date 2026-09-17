-- Add official Social Security disability appeal forms to the secure case
-- document taxonomy. These are ordinary packet documents: they must clear the
-- same quarantine/malware gate as every other enclosure.
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
      'ssa_561',
      'ssa_3441',
      'ssa_827',
      'other'
    )
  );

commit;
