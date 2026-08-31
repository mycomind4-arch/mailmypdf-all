# Notice Respond — Gold Standard Vertical Status

## Purpose

Notice Respond is being rebuilt against the proven MailMyPDF/Appeal Mail product contract while preserving its stronger notice-domain intelligence and consequential workflow engine.

## Completed in this phase

### Identity and account
- MailMyPDF Account authentication is now the canonical identity boundary.
- Supabase sessions persist and refresh in the browser.
- The authenticated user ID is propagated into Notice Respond owner context.
- Dashboard access is fail-closed for unauthenticated users.
- Account settings and admin surfaces use the same identity model.

### Server boundaries
- `/api/auth/status` reports account configuration/authentication state.
- `/api/cases` is the authenticated case-summary boundary.
- `/api/documents` is the authenticated document boundary.
- Admin health is server-authorized.
- Protected actions fail closed instead of silently falling back to dev ownership.

### Mailing + payment
- Mailing checkout now begins with an authenticated Stripe Checkout Session.
- A durable `mailing_intents` record survives the Stripe redirect.
- The Stripe session is linked to the authenticated user and workflow.
- MailMyPDF submission requires a verified paid Stripe session.
- Recipient, mailing method, draft content, and payment state are resolved server-side from the intent.
- MailMyPDF submission uses deterministic idempotency based on the Stripe session.
- Existing direct client-controlled mailing submission is removed from the reusable MailingFunnel.
- Mailing payment/ownership contract has regression coverage in `tests/mailing-payment-contract.test.mjs`.

## Domain capabilities to preserve

Notice Respond already contains substantial domain intelligence that should not be replaced by generic vertical scaffolding:

- CP14 authority-grade gates.
- CP2000 discrepancy analysis, evidence checklist, strategy generation, two-pass validation, research pack, and draft provenance.
- Contradiction detection and missing-information analysis.
- Case health and next-action queues.
- Deadline certainty/urgency modeling.
- Consequential pipeline gates: review → approval → submission → proof.
- Supabase ownership/RLS case persistence.

## Next build order

1. Verify the new payment boundary in the canonical 800+ test suite and clean build.
2. Add real end-to-end Stripe test-mode checkout coverage without sending production mail.
3. Connect the simple legacy workflows (`irs-notice`, `agency-action`, `court-summons`, `file-appeal`) to the reusable authenticated `MailingFunnel` rather than their placeholder checkout.
4. Bring their landing/SEO structure to the Appeal Mail standard: unique H1, canonical, OG/Twitter, BreadcrumbList, FAQ, evidence/deadline sections, CTA → workspace.
5. Finish CP14/CP2000 production route integration and regression tests so the domain-specific Gold logic is guaranteed to remain on the live route.
6. Reuse the completed Notice Respond pattern for the next vertical instead of creating a second authentication, payment, or mailing architecture.

## Verification note

This environment can inspect and write GitHub repository files but cannot resolve GitHub from the local container, so `npm test`/`npm run build` must be executed by the connected development agent before a release is called verified.
