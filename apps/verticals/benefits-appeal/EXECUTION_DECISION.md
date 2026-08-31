# Execution Decision

Status: CATALOG / ARCHITECTURE DECISION

Do not build a second appeal engine.

## Intended workflow

Decision → secure ingest → extract decision facts/deadline → provenance → evidence mapping → rules/requirements research where supported → strategy → draft → validation → human review → filing/mail authorization → tracking → proof.

## Ownership

- Appeal Mail owns generic appeal workflow patterns and domain-neutral response mechanics.
- MailMyPDF Platform owns shared document, evidence, timeline, deadline, workflow, validation, fulfillment, tracking, and proof primitives.
- Benefits Appeal owns benefits-program taxonomy, decision-reason extraction, program-specific requirements, and benefit-specific drafting rules.

## Gate

Build only after Appeal Mail's reusable boundaries are verified. Never infer eligibility or promise an appeal result. Jurisdiction/program rules must be source-backed and versioned.
