# ADR-012: Risk-Tiered Document Handling

## Status

Accepted

## Date

2026-09-12

## Context

MailMyPDF workflows handle documents with materially different sensitivity.
A contractor invoice, an insurance denial, an immigration filing, and an IRS
notice must not all inherit the same handling promise or operational controls.
A single vague "secure" badge would under-protect high-risk matters and add
unnecessary friction to lower-risk work.

## Decision

Every workflow declares one document-handling tier. The tier is a runtime
contract, not merely marketing copy.

### Standard tier

Use for ordinary correspondence and disputes. It requires authenticated,
owner-scoped access; private storage; server-side authorization on every
matter operation; encrypted transport and storage; and no use of customer
documents for marketing.

### High-assurance tier

Immigration Mail workflows and all IRS/tax-document workflows are
high-assurance by default. Before either can be production-certified, its
runtime must demonstrate all of the following:

- account-bound, owner-scoped access to every document, extracted fact,
  artifact, and mailing record;
- MFA or equivalent step-up authentication before viewing, exporting,
  approving, or sending a completed sensitive package;
- separate private storage boundaries and short-lived, scoped document access;
- encryption in transit and at rest, with no sensitive document contents in
  application logs, analytics, or error reporting;
- document minimization and sensitive-identifier warnings/redaction controls;
- immutable audit events for access, export, approval, payment, submission,
  and deletion actions;
- explicit retention and deletion rules, with a customer-visible explanation;
- provider review ensuring AI, storage, payment, and fulfillment vendors only
  receive the minimum necessary data under approved agreements; and
- an independent security review and deployment verification before launch.

No workflow may represent itself as high-assurance until those controls are
implemented and tested in its deployed runtime. Until then it remains a
non-production workflow and must fail closed for real sensitive uploads,
exports, payments, or fulfillment.

## Consequences

- The shared Matter Workspace receives a security-tier configuration but does
  not determine a matter's sensitivity itself.
- High-assurance workflows may add authentication and consent steps while
  retaining the Contractor Dispute visual baseline.
- New workflows must document their tier before implementation; a security
  claim in page copy must map to a tested runtime control.

## Alternatives Considered

### One maximum-security experience for every workflow

Rejected. It adds high-friction controls where they do not improve the user
outcome and makes lower-risk workflows unnecessarily difficult to complete.

### One generic privacy statement for every workflow

Rejected. It obscures the elevated protection required for immigration and
tax documents and is not a meaningful enforceable runtime contract.
