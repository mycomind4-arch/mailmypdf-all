# MailMyPDF Business — Gold Standard Vertical Status

## Completed in this migration

### Tenant/account foundation
- Added MailMyPDF Account-compatible browser auth primitives.
- Added Cloudflare Pages server auth helper that validates Supabase bearer sessions.
- Added business membership checks at the server boundary.
- Added explicit RLS membership policies across business, contact, document, template, schedule, mail-job, approval, tracking, audit, and mailing-intent data.

### Payment/fulfillment boundary
- Added durable `mailing_intents` with business ownership, requester, Stripe session, mail class, draft, recipient, provider, tracking, and failure state.
- Added authenticated Stripe Checkout Pages Function.
- Checkout is server-side and binds the intent to the authenticated user and business.
- Stripe is called directly from the server function, so secret keys never enter the browser.

### Durable automation preserved
- Existing Trigger.dev v4 `execute-mail-job` remains the execution engine.
- Trigger.dev continues to call the MailMyPDF API rather than a carrier directly.
- Existing idempotency and retry behavior remains the durable execution model.

## Remaining before release verification

1. Add the Stripe-paid fulfillment Pages Function / return boundary that resolves the durable mailing intent and queues the Trigger.dev mail job.
2. Wire the existing Composer UI to create a server-side intent rather than only updating its in-memory schedule list.
3. Add account login state and business/member selection into the visible workspace shell.
4. Persist the overview/schedule/contacts/templates UI against Supabase instead of local prototype state.
5. Add tracking webhooks and permanent proof archive.
6. Verify the real Cloudflare Pages project and canonical production hostname.

## Design rule

Business is intentionally not being converted into a generic legal-workflow app. Its domain is scheduled business correspondence and automation. It should consume the same MailMyPDF account, document, payment, fulfillment, tracking, and proof infrastructure while keeping its business-specific workflows, approvals, schedules, CRM boundaries, and automation engine.
