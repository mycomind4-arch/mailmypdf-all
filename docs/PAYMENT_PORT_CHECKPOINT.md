# Payment port checkpoint — 2026-09-08

Branch: `fix/ecosystem-build-and-vitest-crash`.

## Implemented

- Notice Respond was already ported in `0a0f2ac`; this continuation does not change it.
- Benefits Appeal: replace all 15 workflow approval and checkout placeholders with registered TanStack handlers. Verify authentication and case ownership, run server readiness checks, and persist an immutable approved letter/recipient snapshot. Checkout accepts the approval ID, computes a server quote, binds a Stripe session, and uses a stable idempotency key. The legacy server-function checkout now delegates through these authenticated routes.
- Benefits Appeal: replace the five-workflow webhook allowlist with the canonical fulfillment engine. Verify signature, paid status, owner/workflow/case/session, currency and amount. Preserve failures for Stripe retry. Add authenticated browser-return fulfillment and a return-status banner.
- Appeal Mail: require paid checkout, return non-success responses for fulfillment/storage failures, bind new checkouts to packet hashes/IDs, use checkout idempotency keys, propagate refund metadata on all 34 workflow checkouts, and preserve the literal Stripe success-URL placeholder. Add authenticated browser fallback and status banner. Do not let stale expiry events overwrite fulfilled mailings; reconcile full refunds only against matching payment IDs.
- Appeal Mail: surface storage errors instead of silently acknowledging failed writes.
- Register the new endpoints in generated route trees and add payment regression suites to both apps.

## Deployment prerequisites

Apply each migration to its own existing **Supabase** database, not the unrelated workspace InsForge project:

- `apps/verticals/benefits-appeal/supabase/migrations/20260908_payment_fulfillment.sql`
- `apps/verticals/appeal-mail/supabase/migrations/20260908_fulfillment_errors.sql`

Both webhook URLs remain `/api/stripe-webhook`; browser fallback is `POST /api/mail/response` with `{ sessionId }` and a verified bearer token. Register completed, asynchronous-payment-succeeded, expired and refunded events. Existing Supabase, Stripe, MailMyPDF and APP_URL settings are required. This task does not apply remote migrations, register webhooks, charge cards, send letters, or deploy.

## Validation

- New payment suites: Benefits Appeal 21 tests; Appeal Mail 19 tests.
- Appeal Mail existing Node suite: 845 passed.
- Benefits Appeal existing Node suite: 20 passed.
- Benefits Appeal broader source suite: 9 failed assertions and 1 import failure. Reproduced the same failures against a clean HEAD archive: obsolete non-benefits workflow tests, old pricing configuration assumptions, a decision-extraction expectation, and stale keyword metadata. No new payment test failed.
- Benefits Appeal type checking still reports pre-existing errors in domain/UI and obsolete analyze/draft imports. The alias configuration is now explicit; new payment modules do not introduce reported type errors.
- Both worker builds were verified; builds warn about unrelated files without Route exports and existing large chunks.
- Browser: signed-out Benefits Appeal checkout return displays the sign-in status rather than claiming payment or mailing success. Development tooling emits an existing source-location hydration attribute warning.
- Database migrations and authenticated Stripe-to-provider end-to-end fulfillment still need staging verification.

## Remaining product gaps (not payment-route migration)

Benefits Appeal's analysis/drafting endpoints remain unimplemented legacy placeholders. A saved, reviewable case is required for the new approval path; the port does not make the full intake-to-draft product launch-ready. The letter-only fulfillment adapter rejects evidence requiring document attachments instead of silently dropping them. Packet assembly must be implemented before enabling such cases. Its existing dashboard reads legacy mailings; new intent tracking should be integrated before launch.

The earlier handoff's claim that all applications are deployment-ready is therefore too broad. Notice Respond's existing test command also failed (995 passed, 13 failed) during the initial baseline check, including mixed Node/Vitest runner usage. No changes were made there.

## Rollback

Revert the application commits to restore the prior route code. Preserve the new mailing-intent table and payment records for reconciliation; do not drop payment history as part of a code rollback. Any checkout already issued by the new handlers requires the new webhook path to remain operational until settled or expired.

## References

Stripe's [fulfillment guidance](https://docs.stripe.com/checkout/fulfillment) and [metadata propagation contract](https://docs.stripe.com/metadata) informed the paid-state, retry and refund handling.
