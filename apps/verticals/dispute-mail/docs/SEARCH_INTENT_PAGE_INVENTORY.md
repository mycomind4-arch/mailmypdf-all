# Dispute Mail — Search-Intent Page & Workflow Inventory

## Architecture

Dispute Mail organizes by **specific customer problem**, not generic letter templates. Each problem maps to one workflow ID and one canonical intent page. Supporting sample/template terms belong on the canonical problem page rather than separate near-duplicate product pages.

## Workflow catalog

### Debt / collections
- `/workflows/debt-collection-dispute` — debt collection dispute
- `/workflows/dispute-collection-agency` — dispute collection agency
- `/workflows/debt-dispute` — debt dispute letter
- `/workflows/debt-validation` — debt validation letter
- `/workflows/medical-collections` — dispute medical collections
- `/workflows/cease-contact` — cease contact / collection communication request

### Credit reporting
- `/workflows/credit-report` — credit dispute letter
- `/workflows/credit-report-collections` — dispute collections on credit report
- `/workflows/hard-inquiry` — hard inquiry removal letter
- `/workflows/charge-off` — charge off dispute letter
- `/workflows/student-loan` — student loan dispute letter

### Billing / transaction
- `/workflows/credit-card-billing` — credit card dispute letter
- `/workflows/unauthorized-charge` — unauthorized charge dispute
- `/workflows/billing-error` — billing dispute letter
- `/workflows/subscription-billing` — subscription billing dispute
- `/workflows/service-contract` — service contract dispute letter
- `/workflows/insurance-billing` — insurance billing dispute letter

### Follow-up / escalation
- `/workflows/follow-up-no-response` — dispute follow-up with no response
- `/workflows/inadequate-response` — dispute escalation after inadequate response

## Conversion path

Search → exact dispute problem → profile-specific intake → source/evidence analysis → facts/provenance → strategy → draft → validation → human review → explicit approval → payment → authorized mailing → tracking → proof/audit.

## SEO rules

Own the core intent once. Use examples, FAQs, and supporting terms on the canonical workflow page instead of creating dozens of near-duplicate sample/template pages.

Do not promise debt removal, deletion, refunds, legal outcomes, or guaranteed dispute success. Market the concrete process and documented outcome instead.
