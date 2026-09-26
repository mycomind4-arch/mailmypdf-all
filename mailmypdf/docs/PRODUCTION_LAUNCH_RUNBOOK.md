# MailMyPDF Production Launch Runbook

This is the release gate for accepting real customer payments and submitting real physical mail.

## Rule

Do not enable `AUTO_SUBMIT_TO_LOB=true` in production until the sandbox canary passes end to end and the production database migration is applied.

## 1. Domain and production origin

1. Attach the production domain to the Cloudflare Worker.
2. Enforce HTTPS.
3. Choose one canonical hostname and redirect the other hostname to it.
4. Set:
   - `MAILMYPDF_BASE_URL=https://<production-host>`
   - the same production host in Supabase Auth allowed redirect URLs.
5. Verify payment return URLs remain on that exact origin.

## 2. Production database

Before deploying the code that writes delivery evidence, apply:

`supabase/migrations/20260926223000_add_order_delivery_evidence.sql`

The `orders` table must expose these server-side fields:

- `document_sha256`
- `tracking_number`
- `expected_delivery_date`
- `delivered_at`
- `last_tracking_event`

Also verify the required `order-pdfs` and `secure-documents` storage buckets and all secure-workflow tables.

The production deployment must point at the intended MailMyPDF Supabase project. Do not substitute another project merely because it is reachable.

## 3. Required production secrets

Configure server-side secrets in Cloudflare Workers. Never expose secret/service-role values through `VITE_` variables.

### Stripe

- `PAYMENTS_ENV=sandbox` for staging verification, then `live` for launch.
- `STRIPE_SANDBOX_API_KEY`
- `PAYMENTS_SANDBOX_WEBHOOK_SECRET`
- `STRIPE_LIVE_API_KEY`
- `PAYMENTS_LIVE_WEBHOOK_SECRET`
- `VITE_PAYMENTS_CLIENT_TOKEN` matching the selected environment.

Production Stripe webhook:

`POST https://<production-host>/api/public/payments/webhook`

Events consumed by the current handler include:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `payment_intent.payment_failed`
- refund events
- subscription/invoice events used by subscription functionality

## 4. Lob

Configure:

- `LOB_API_KEY`
- `LOB_WEBHOOK_SECRET`
- `AUTO_SUBMIT_TO_LOB=false` initially

Production Lob webhook:

`POST https://<production-host>/api/public/lob-webhook`

The combined route handles ordinary MailMyPDF orders and proof-of-service communications.

For evidence-sensitive mailings, verify both:

- Certified Mail
- Certified Mail + Electronic Return Receipt (`certified_return_receipt`)

The customer order record must capture the Lob provider ID, tracking number when available, lifecycle events, mailed timestamp, expected delivery date when available, and delivered timestamp when a verified provider event reports delivery.

## 5. Scheduled jobs

Set a 32+ character `MAILMYPDF_CLEANUP_SECRET`.

The Cloudflare Worker cron runs every five minutes and invokes:

- `/api/internal/proof-processor`
- `/api/internal/publication-scheduler`

A proof-processor maintenance failure must return non-2xx so the scheduled handler and monitoring can see the failure.

Secure-document jobs are separate GitHub Actions jobs. Configure repository secrets:

- `MAILMYPDF_APP_URL`
- `MAILMYPDF_SCANNER_JOB_SECRET`
- `MAILMYPDF_RETENTION_JOB_SECRET`

A green scheduled workflow whose scan step is skipped does **not** count as a healthy scanner.

## 6. Malware scanner

Deploy the self-hosted scanner in `services/malware-scanner` and configure:

- `MAILMYPDF_MALWARE_SCANNER_URL` — production must be HTTPS
- `MAILMYPDF_MALWARE_SCANNER_KEY` — at least 32 characters
- `MAILMYPDF_SCANNER_JOB_SECRET` — at least 32 characters
- `MAILMYPDF_RETENTION_JOB_SECRET` — at least 32 characters

Confirm `GET <scanner-url>/health` is healthy and definitions are current.

## 7. Transactional email

Configure and verify a sender domain with the email provider, then set:

- `RESEND_API_KEY`
- `RESEND_FROM_ADDRESS`
- `RESEND_SUPPORT_EMAIL`

Test payment confirmation and mailed-status messages. Confirm that private order links work from the received email.

## 8. Read-only production preflight

From the repository root with the deployment environment loaded:

```sh
pnpm --filter ./mailmypdf verify:production-config -- --live
```

Do not proceed while this command reports a FAIL.

Then run the full application launch gate:

```sh
pnpm --filter ./mailmypdf verify:launch
```

## 9. Stripe -> Lob sandbox canary

Keep `PAYMENTS_ENV=sandbox` and `AUTO_SUBMIT_TO_LOB=false`.

For one new order:

1. Upload a safe PDF.
2. Verify a draft order is created and the document SHA-256 is stored.
3. Complete Stripe test Checkout.
4. Confirm only the verified Stripe webhook changes the order to paid/pending fulfillment.
5. Replay the same Stripe event and confirm no duplicate payment event, confirmation email, or fulfillment.
6. Manually submit the paid order to Lob test mode.
7. Confirm exactly one Lob letter ID is attached to the order.
8. Confirm the downloadable mailing evidence record contains the document hash and provider reference.

Then enable `AUTO_SUBMIT_TO_LOB=true` in sandbox for a new order and repeat. Verify exactly one provider submission.

Also test:

- failed payment => no Lob submission
- webhook replay => no duplicate submission
- simulated provider timeout / 429 / 5xx => retry or recoverable failure
- missed Lob webhook => reconciliation path does not corrupt order state

## 10. Live canary

After sandbox passes:

1. Apply/verify production database migrations.
2. Set `PAYMENTS_ENV=live` with matching live publishable/server keys and live webhook secret.
3. Leave public traffic restricted.
4. Submit one inexpensive real order to an address you control.
5. Verify the Stripe charge, webhook event, one Lob mailpiece, customer email, order timeline, and downloadable evidence.
6. Send a Certified Mail canary and verify the USPS/Lob lifecycle reaches the application.
7. Send a Certified Mail + Electronic Return Receipt canary if that service will be sold.
8. Verify the final evidence record contains the same document SHA-256 produced before mailing and the carrier identifiers/events actually received.

Only then enable public `AUTO_SUBMIT_TO_LOB=true`.

## 11. Evidence to preserve for launch

For each canary retain:

- application order ID
- document SHA-256
- Stripe Checkout Session / Payment Intent / event IDs
- order event rows
- Lob letter ID
- carrier tracking number when available
- webhook event IDs
- screenshots of Stripe and Lob dashboards
- customer payment and mailed emails
- downloaded mailing evidence JSON
- exact deployed Git commit/tag

## 12. Release controls

Before public launch:

- protect `main`
- require the production-critical CI checks
- prohibit force pushes to `main`
- deploy from a tagged/known commit
- retain a rollback procedure that does not delete payment or fulfillment history
- alert on Stripe/Lob webhook failures, scanner failures, cron failures, and stale provider submissions
