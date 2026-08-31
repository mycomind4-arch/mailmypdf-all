# Dispute Mail Capability Status

Updated: 2026-08-20

Dispute Mail now defines **19 distinct problem-specific workflows**. They share one profile-driven execution engine, but each workflow owns its own search intent, intake facts, evidence requirements, deadline policy, recipient role, objective prompt, and draft framing.

## Workflow inventory

| Workflow | Primary problem | Domain profile | Intake/execution | Gold |
|---|---|---|---|---|
| Debt collection dispute | Debt account dispute | Implemented | Executable | No — fulfillment E2E pending |
| Collection agency dispute | Collection agency dispute | Implemented | Executable | No — fulfillment E2E pending |
| Debt dispute | Debt balance/account dispute | Implemented | Executable | No — fulfillment E2E pending |
| Debt validation | Validation/verification request | Implemented | Executable | No — fulfillment E2E pending |
| Credit report | Credit reporting error | Implemented | Executable | No — fulfillment E2E pending |
| Credit-report collections | Collection reporting error | Implemented | Executable | No — fulfillment E2E pending |
| Hard inquiry | Unrecognized hard inquiry | Implemented | Executable | No — fulfillment E2E pending |
| Charge-off | Charge-off reporting dispute | Implemented | Executable | No — fulfillment E2E pending |
| Medical collections | Medical bill/collection dispute | Implemented | Executable | No — fulfillment E2E pending |
| Student loan | Student loan account dispute | Implemented | Executable | No — fulfillment E2E pending |
| Credit-card billing | Credit-card billing error | Implemented | Executable | No — fulfillment E2E pending |
| Unauthorized charge | Unauthorized transaction | Implemented | Executable | No — fulfillment E2E pending |
| Billing error | Incorrect invoice/bill | Implemented | Executable | No — fulfillment E2E pending |
| Subscription billing | Recurring/cancellation billing dispute | Implemented | Executable | No — fulfillment E2E pending |
| Service contract | Service performance/billing dispute | Implemented | Executable | No — fulfillment E2E pending |
| Insurance billing | Insurance payment/billing dispute | Implemented | Executable | No — fulfillment E2E pending |
| Follow-up no response | Missing response to prior dispute | Implemented | Executable | No — fulfillment E2E pending |
| Inadequate response | Escalation after inadequate response | Implemented | Executable | No — fulfillment E2E pending |
| Cease-contact correspondence | Collection communication request | Implemented | Executable | No — fulfillment E2E pending |

## What "executable" means here

The shared profile-driven engine can run problem-specific secure ingest, classification, facts/provenance, deadline policy, findings, evidence requirements, strategy, draft generation, validation, and consequential blocking gates for every registered workflow.

## Gold certification rule

A workflow cannot be promoted to Gold merely because its UI flow, SEO page, or profile exists. Gold requires:

1. dedicated problem-specific domain analysis
2. evidence/provenance gates
3. validated draft and explicit human review
4. explicit human approval
5. authorized payment/fulfillment
6. real MailMyPDF submission
7. tracking
8. proof/audit
9. regression coverage
10. deployed end-to-end verification

The current 19-workflow wave establishes the complete **problem catalog + reusable domain execution layer**. The next phase is to connect each workflow to persistent case state, real document upload/storage, the authenticated MailMyPDF fulfillment path, tracking, and proof, then certify workflows individually.
