# Dispute Mail — Gold Standard Vertical Status

## Completed in this migration

### Identity
- MailMyPDF Account auth context with persistent Supabase sessions.
- Password, signup, magic-link, and reset-password flows.
- Server bearer-token authentication guard.
- TanStack server-function auth middleware injects and revalidates the current account token.

### Data/security
- `dispute_cases` RLS now has explicit owner policies.
- `dispute_case_evidence` RLS now has explicit owner policies.
- `dispute_case_events` RLS now has explicit owner policies.
- Durable `mailing_intents` table with owner-scoped RLS and immutable owner identity.

### Fulfillment
- MailMyPDF adapter uses canonical `/v1/documents` and `/v1/communications` endpoints.
- Multipart uploads preserve the runtime Content-Type boundary.
- Provider idempotency is carried in `Idempotency-Key`.
- Stripe checkout is authenticated and binds payment to a durable mailing intent.
- Final mailing requires a verified paid Stripe session and the same account owner.
- Physical mailing is idempotent by Stripe session.
- Dispute case state is updated after provider submission/failure.

### Workflow
- Existing Claude document analysis remains the domain intelligence engine.
- Existing evidence, findings, validation, and `canAuthorizeDisputeMail`/`canSubmitDispute` gates remain authoritative.
- Mailing UI is shown only after a draft exists and passes validation, with explicit human approval and recipient completion required before checkout.
- Stripe return is handled centrally and triggers server-side MailMyPDF submission.

## Remaining before release verification

1. Run the complete Vitest suite and production build.
2. Run Stripe test-mode checkout end-to-end.
3. Run MailMyPDF/Lob test-mode fulfillment and verify idempotency/tracking.
4. Verify cross-user RLS on cases/evidence/events/intents.
5. Add durable document/case linkage to the full workflow state where needed.
6. Apply Appeal Mail SEO landing-page standard across all dispute workflow routes.
7. Verify production hostname/deployment and canonical metadata.

## Non-negotiable rule

Never bypass the dispute evidence/validation/human-approval gates to reach payment or physical mailing.
