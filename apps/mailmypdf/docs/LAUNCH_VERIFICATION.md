# MailMyPDF launch verification

## Repository finding

The July 9 revert restored the exact file tree that existed before the five planning/test-labelled commits. Those commits did not add an executable end-to-end test suite; their lasting file changes were a Lovable planning document, a lockfile change, and a Lovable plugin version change.

This branch adds executable regression guards for the most important fulfillment boundary: Lob must never receive an order before the verified Stripe webhook marks that order paid.

## Server-controlled payment boundary

Payment mode and redirect origin are deployment configuration, not browser input.

Configure the deployment with:

- `PAYMENTS_ENV=sandbox` until every external launch check below passes;
- `MAILMYPDF_BASE_URL` set to the exact HTTPS origin of the deployed preview or production site;
- a test Stripe publishable client token while `PAYMENTS_ENV=sandbox`;
- the matching sandbox Stripe connector key and webhook-signing secret;
- Supabase server credentials;
- Lob credentials only in the server environment; and
- `AUTO_SUBMIT_TO_LOB=false` until automatic sandbox fulfillment has been approved.

The server ignores legacy client-supplied environment and return-URL fields. The payment webhook no longer accepts an environment query parameter. Checkout return URLs are derived from `MAILMYPDF_BASE_URL`, and the order lookup token is not copied into Stripe metadata.

Checkout creation reuses a stored Stripe session when possible and uses a deterministic idempotency key per order. The automatic-tax fallback was removed. Do not enable Stripe Tax or automatic tax calculation until the seller has confirmed the required registrations and tax configuration.

## Automated checks

Run:

```sh
npm ci
npm test
npm run build
```

The tests verify:

- orders are created as drafts;
- only a verified payment webhook transitions a draft to paid;
- automatic Lob submission occurs only after the successful paid transition and duplicate guard;
- order creation does not call Lob;
- Lob submissions use deterministic idempotency keys and allowed statuses;
- Stripe and Lob signature and timestamp checks remain present;
- duplicate payment and Lob event protections remain present;
- payment environment and return origin are server-controlled;
- Stripe metadata excludes the order lookup bearer token;
- checkout session creation is idempotent; and
- checkout does not silently enable automatic tax.

## External sandbox checks still required

Static and repository-backed regression guards cannot replace a real Stripe-to-Lob sandbox order. Before enabling live payments:

1. Deploy a preview with `PAYMENTS_ENV=sandbox` and `AUTO_SUBMIT_TO_LOB=false`.
2. Complete a Stripe sandbox payment and confirm no Lob request occurs before payment success.
3. Replay the successful Stripe event and confirm no duplicate payment events, emails, or fulfillment.
4. Submit the paid order manually and confirm exactly one Lob test letter.
5. Enable automatic submission in sandbox and repeat with a new order.
6. Send a failed-payment event and confirm no Lob request occurs.
7. Confirm the configured return URL remains on the approved deployment origin.
8. Preserve screenshots, order IDs, event rows, Stripe event/session IDs, and Lob provider IDs as launch evidence.

Keep `AUTO_SUBMIT_TO_LOB=false` and do not use live Stripe credentials until those external checks pass.

## Separate upload and retention gate

The application stores the PDF before payment so Stripe checkout can begin. A public deployment also requires rate limiting, abuse prevention, abandoned-draft cleanup, secure retention/deletion rules, and hostile-PDF validation. These controls are tracked separately and remain a launch blocker even after this payment-boundary pull request is merged.
