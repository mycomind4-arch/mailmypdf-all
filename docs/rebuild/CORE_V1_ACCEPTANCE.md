# MailMyPDF Core V1 — restart contract

Status: isolated rebuild branch. The existing platform remains unchanged on main.

## Product promise
Upload a PDF -> specify and validate sender/recipient -> preview exact pages and envelope -> Stripe checkout -> Lob print-and-mail -> persist provider evidence/status.

## Non-negotiable release gates
1. Anonymous visitors can read marketing content, but authenticated users only may create an order.
2. PDF uploads are type/size/page validated; malicious or unsupported files fail with actionable errors. Scanner must progress from quarantine to clean or explicit failure within a bounded time; no indefinite pending state.
3. Preview renders the actual stored PDF and recipient address. Recipient and return address are confirmed explicitly.
4. Server computes prices; Stripe sandbox payment webhook is verified before any Lob call.
5. Lob is disabled by default. Sandbox-only runs cannot submit real mail. Live submission requires explicit owner enablement and per-order user approval.
6. Exactly-once provider submission via idempotency key and persisted order state. Retries cannot duplicate mail.
7. Webhook verification, fulfillment state, receipts and provider identifiers are recorded; never claim delivery proof unless provider supplies it.
8. End-to-end test: create synthetic 1-page PDF -> upload -> scan -> preview -> sandbox checkout -> verified webhook -> simulated Lob submission -> status. Then separate owner-approved live test.
9. No IRS, appeals, legal automation, agents, workflow catalog or SEO factory in the V1 customer path.

## Implementation sequence
A. Inventory existing auth, PDF storage/scanner, Stripe and Lob adapters; reuse only if they pass tests.
B. Implement one canonical Order state machine: draft, file_pending, file_clean, preview_ready, awaiting_payment, paid, submitted, processing, completed, failed, cancelled.
C. Build single-page authenticated UI and API for upload, addresses, preview and checkout.
D. Write deterministic local integration tests with Stripe/Lob mocks and failure injection.
E. Verify staging end-to-end before enabling production or touching main.

## Explicit exclusions
No real payments, mail submissions, credential changes, deployments, destructive file removals or merging without verified release readiness.

## Definition of done
A human can finish the core journey without developer intervention, and the staging acceptance run produces inspectable PDF preview, payment event, Lob request/response (mocked), order status and audit log.
