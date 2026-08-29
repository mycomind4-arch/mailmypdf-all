# Build status

## Implemented

- MailMyPDF Business domain model for businesses, contacts, documents, templates, schedules, mail jobs, approvals, tracking, and proof.
- Deterministic schedule calculation for one-time, daily, weekly, and monthly schedules.
- Idempotency-key generation for scheduled occurrences and payment intents.
- Governed Small Business workflow registry with approval/risk/mail-class policy.
- Authenticated Stripe checkout with durable `mailing_intents` and server-side payment verification.
- Paid-intent → Trigger.dev bridge with idempotency and owner checks.
- Durable `execute-mail-job` Trigger boundary with strict payload/response validation.
- Canonical MailMyPDF execution contract; the vertical never calls a carrier directly.
- Provider boundaries for CRM and integration systems.
- Launch CI covering dependency installation, tests, and production build.

## Current release gate

The payment/execution state machine is now fail-closed through the real executable `mail_jobs` boundary. A paid intent cannot be queued unless it references an existing business mail job with a real recipient and document.

The remaining integration work is **mail-job preparation**, not fulfillment invention: the composer must create/select a real business contact and document, persist a real `mail_jobs` row, and carry the canonical MailMyPDF document/recipient identifiers required by the fulfillment contract before payment is offered.

This is intentionally not marked production-complete yet. Do not charge a user for a mailing that cannot reach a real executable mail job.

## Production safety requirements

- Configure `MAILMYPDF_API_URL`, `MAILMYPDF_API_KEY`, Trigger credentials, Stripe credentials, and Supabase server credentials in the deployment environment.
- Require explicit approval for workflows whose domain policy requires it.
- Verify real test-mode MailMyPDF fulfillment before enabling production physical mailing.
- Reconcile tracking/proof through MailMyPDF's canonical events rather than fabricating provider state in the vertical.
