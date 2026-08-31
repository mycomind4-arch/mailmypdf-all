# Immigration Mail Architecture

## Boundary

Immigration Mail is a standalone vertical. Do not import application code from MailMyPDF. Future shared services should be consumed through interfaces or a versioned platform API.

## Vertical-owned layers

- `src/domain/workflows.ts` — immigration workflow definitions and state model
- `src/routes/` — vertical UX and acquisition pages
- future `src/content/` — authoritative educational content and source metadata
- future `src/ai/` — immigration-specific prompts and output validation

## Shared-platform boundary

Future adapters should live behind interfaces such as:

- `MailingProvider`
- `PaymentProvider`
- `DocumentStore`
- `IdentityProvider`
- `TrackingProvider`
- `ProofProvider`
- `AnalyticsProvider`

The vertical should not assume Lob or Stripe details throughout the UI.

## Sensitive data

Immigration documents and case details are sensitive. Never send document contents or case facts into marketing analytics. Use private storage, authorization checks, signed access, retention policies, and explicit deletion paths.

## Workflow state

A workflow is a structured state machine, not a single page. Each step must be resumable and validated before progression. Drafts remain user-controlled until explicit submission.

## AI boundary

AI can summarize, extract, organize, and draft based on supplied information. It must not invent facts or convert uncertain information into authoritative legal conclusions.
