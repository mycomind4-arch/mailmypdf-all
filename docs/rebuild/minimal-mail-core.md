# MailMyPDF minimal rebuild — execution contract

Status: proposed isolated replacement; NOT deployed or production certified.

## Product
One authenticated user uploads a PDF, supplies sender and recipient, previews the exact immutable mailing packet, explicitly approves that exact packet and price, pays via Stripe, and receives Lob submission status and available delivery evidence.

## Non-negotiable invariants
- Keep existing production tables, migrations, secrets, worker, domain, and main branch unchanged during development.
- No mailing before verified Stripe payment AND an unexpired user approval bound to immutable PDF hash, enclosure set, address snapshot, price, and account ID.
- Idempotency keys for checkout, webhook processing, and Lob submission; retry must not create duplicate mailings.
- Authenticated owner-scoped access and private PDF storage; never expose service credentials to the browser.
- Stripe webhook signatures verified; client-side success redirects never establish payment.
- Lob webhooks verified and deduplicated; label 'submitted' separately from 'delivered' and 'proof of delivery'.
- Fail closed when a prerequisite is absent. Synthetic tests must not call live payment or mail providers.

## Minimal UI
1. Upload PDF (type, size, pages, scan checks).
2. Addresses (validate and explicitly confirm).
3. Exact final PDF preview, quote, checkbox approval.
4. Hosted Stripe checkout.
5. Receipt and mailing status page.

## Minimal server operations
- POST /api/v1/mail/drafts
- PUT /api/v1/mail/drafts/:id/addresses
- POST /api/v1/mail/drafts/:id/finalize
- POST /api/v1/mail/drafts/:id/approve
- POST /api/v1/mail/drafts/:id/checkout
- POST /api/v1/webhooks/stripe
- POST /api/v1/webhooks/lob
- GET /api/v1/mail/orders/:id

These are target interfaces, not claims that routes already exist.

## Implementation order and gates
A. Inspect canonical repo and choose an isolated application path; identify reusable tested auth, PDF, Stripe, Lob, storage modules.
B. Build mock-only end-to-end happy path and negative tests for ownership, altered packet hash, stale approval, payment mismatch, webhook replay, duplicate send.
C. Wire real providers in test/sandbox only; prove exactly-once submission under retries and concurrency.
D. Independent security and legal review; verify backup and migration plan.
E. Owner-approved staging deployment, then controlled production launch. No live charge or mailing as a smoke test.

## Out of scope until one transaction passes
Workflow factory, 400+ workflow registry, automated letter generation, AI agents, multi-vertical navigation, public MCP execution, marketing SEO expansion.

## Acceptance criteria
An authenticated synthetic user can complete upload → address → immutable preview → approval → mock payment → exactly-one mock Lob submission → status, with recorded automated tests and a clear deployment readiness report.
