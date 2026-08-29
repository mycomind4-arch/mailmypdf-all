# Immigration Mail — Gold Standard Vertical Status

## Reference contract

Immigration Mail is being migrated to the MailMyPDF Gold Standard Workflow Contract and the shared Vertical Fulfillment Contract.

## Completed

### Identity
- Shared MailMyPDF Account identity model.
- Persistent Supabase sessions with auto refresh.
- Password authentication, signup, magic-link login, and password reset.
- Server-side bearer-token authentication guard.

### MailMyPDF adapter
- Canonical `/v1/documents` endpoint.
- Canonical `/v1/communications` endpoint.
- Server-only MailMyPDF API key.
- Multipart uploads preserve the runtime-provided Content-Type boundary.
- Provider idempotency is supported.

### Payment-first fulfillment
- Durable `mailing_intents` table with owner/RLS protection.
- Authenticated Stripe Checkout creation.
- Stripe metadata binds payment to the MailMyPDF user and mailing intent.
- Stripe return is verified server-side before fulfillment.
- MailMyPDF submission is reconstructed from server-stored intent data.
- Provider submission uses deterministic Stripe-session idempotency.
- Legacy `Respond to a Notice` checkout now enters the secure Stripe boundary.

### Regression coverage
- `tests/mailmypdf-gold-contract.test.ts` locks the main adapter and fulfillment contracts.
- GitHub Actions already runs `npm ci` followed by `npm run verify:launch` on pushes and pull requests.

## Still required before release

1. Run the complete Vitest suite and production build after these migrations.
2. Execute Stripe test-mode checkout through the real deployed route.
3. Execute MailMyPDF/Lob test-mode submission and verify tracking/idempotency.
4. Verify Supabase RLS with cross-user access attempts.
5. Migrate remaining workflows to the same payment-first fulfillment seam.
6. Complete production tracking webhook and proof archive integration.
7. Verify the canonical public deployment hostname and all SEO routes.

## Rule for future work

Do not reintroduce direct browser-to-MailMyPDF fulfillment, client-supplied payment claims, or placeholder checkout success. Domain workflows own immigration intelligence; MailMyPDF Platform owns authentication, fulfillment, tracking, proof, and shared infrastructure.
