# Private Office Compound Workflows

## Purpose

Private Office now has a compound-workflow planning and orchestration layer for matters that cannot be solved safely by a single letter or form.

A compound workflow is a directed sequence of governed phases. Each phase combines existing capabilities such as authority research, records acquisition, evidence preservation, timeline reconstruction, contradiction analysis, notice, appeal preparation, hearing preparation, mailing proof, and attorney handoff.

## Flagship workflows

1. Government Accusation Defense
2. Property & Estate Reconstruction
3. Government Accountability Investigation
4. Personal Legal Autonomy & Asset Control

## Execution rules

- Facts must retain provenance.
- A later phase cannot unlock until its dependencies are complete.
- Evidence, authority, deadline, counsel-escalation, and human-review gates may block progression.
- No filing, mailing, service, settlement, admission, transfer, waiver, or payment is automatic.
- Public notice is never treated as a substitute for legally sufficient service unless verified for the matter.
- High-risk legal decisions are packaged for professional review rather than silently decided by the model.
- Pseudo-legal status theories are not treated as mechanisms for eliminating taxes, court jurisdiction, or generally applicable law.

## Current implementation

The first implementation lives in:

- `src/domain/compound-workflows.ts` — typed orchestration definitions, dependency logic, gates, and validation.
- `src/domain/compound-workflows.test.ts` — graph and safety invariants.
- `src/components/compound-workflow-page.tsx` — reusable authority/orchestration page.
- `src/routes/workflows/*` — public entry pages for each flagship compound workflow.

This establishes the execution contract and discoverability layer. The next implementation step is runtime dispatch: persist phase state per matter and connect each capability label to the canonical MailMyPDF platform adapters/pipelines rather than executing duplicate vertical-specific logic.
