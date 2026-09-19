# MailMyPDF — Production Baseline Audit

**Date:** 2026-08-21
**Branch:** main (commit c0c2946)
**Deployment:** Cloudflare Workers (mailmypdf.mycomind4.workers.dev)

---

## 1. Current Product Definition

MailMyPDF is an online print-and-mail service for important documents. Users upload a PDF or write a letter in-browser, choose mailing options (standard/certified/registered), pay via Stripe, and Lob prints and mails the document through USPS. The platform also hosts specialized vertical workflows (appeals, notices, immigration, records requests) built on the same mailing foundation.

**Core flow:** Prepare → Choose → Send

---

## 2. Production-Ready Capabilities (COMPLETE)

### Core Mailing Workflow — COMPLETE
- **PDF upload flow** (`src/routes/send.tsx`): Full multi-step wizard (Upload → Addresses → Review → Pay). Validates PDF, calculates price, creates order, initiates Stripe checkout.
- **Letter creation flow** (`src/routes/write.tsx`): Full letter editor with template selection, address entry, pricing preview, and checkout.
- **Order creation** (`src/services/mail.service.ts`): `createOrderFromPdf()` and `createOrderFromLetter()` handle rate limiting, input sanitization, PDF validation, storage upload, DB insert, and event recording with cleanup on failure.
- **Tests:** `tests/order-state-machine.test.mjs`, `tests/pricing-surcharge.test.mjs`, `tests/payment-fulfillment-boundary.test.mjs`

### Document Upload/Processing — COMPLETE
- **PDF validation** (`src/lib/pdf-validation.server.ts`): Checks header, EOF marker, encryption, forbidden tokens (JavaScript, Launch, etc.), max size (10MB), max pages (10), max indirect objects.
- **Letter PDF generation** (`src/lib/letter-pdf.server.ts`): Uses pdf-lib to generate properly formatted business letters with sender/recipient headers.
- **Storage** (`src/services/document.service.ts`): Uploads to Supabase Storage bucket `order-pdfs`, with cleanup on failure.

### Letter Creation — COMPLETE
- **Templates** (`src/routes/templates.tsx`): 20+ templates across Legal, Personal, Business, Official categories.
- **Future-self letters** (`src/routes/future-self.tsx`): Scheduled letter delivery with full checkout flow.
- **Letter pricing preview**: Server function `previewLetterPricing` returns page count and price.

### Address/Recipient Handling — COMPLETE
- **Address validation** (`src/lib/address-validation.ts`): Real Lob `/v1/us_verifications` API integration. Validates deliverability, returns corrections, logs warnings.
- **Input sanitization** (`src/lib/sanitize.ts`): `sanitizeAddress()` and `sanitizeEmail()` used in MailService.

### Mailing-Class Selection — COMPLETE
- Standard, Certified, and Registered mail options presented in UI (send.tsx, write.tsx, future-self.tsx).
- `MAIL_CLASS_LABELS` from pricing.ts provides user-facing descriptions.
- Lob `extra_service` parameter mapped correctly in `submitOrderToLob()`.

### Lob/Fulfillment Integration — COMPLETE
- **`src/lib/lob.server.ts`** (677 lines): Full integration with Lob API.
  - `createLobLetter()`: Real API call with retry, timeout, idempotency key.
  - `submitOrderToLob()`: Fetches order, creates signed PDF URL, submits to Lob, updates status via state machine.
  - `processLobWebhook()`: Handles Lob webhook events, deduplicates, maps statuses, sends email notifications.
  - `reconcileOrderWithLob()`: Reconciliation for stuck orders.
  - `getDueScheduledOrders()`: Scheduled delivery support.
- **Webhook verification**: `verifyLobWebhook()` checks signatures.
- **Tests:** `tests/lob-hardening.test.mjs`

### Stripe/Payment Integration — COMPLETE
- **`src/lib/stripe.server.ts`**: Real Stripe SDK integration with sandbox/live environments.
- **Checkout** (`src/services/billing.service.ts`): Creates Stripe checkout sessions, handles existing session reuse, Pro subscription discounts.
- **Webhook handler** (`src/routes/api/public/payments/webhook.ts`): SDK-based signature verification, event deduplication, order status transitions, refund handling.
- **Pro subscription** (`src/lib/subscriptions.ts`): $9.99/month, 5 free letters, $3.99/letter after.
- **Tests:** `tests/stripe-production.test.mjs`, `tests/payment-fulfillment-boundary.test.mjs`

### Order Creation — COMPLETE
- Zod-validated server functions in `src/lib/orders.functions.ts`.
- MailService orchestrates document processing, pricing, and persistence.
- Order events recorded for audit trail.

### Mailing Status/Tracking — COMPLETE
- **Order state machine** (`src/lib/order-state-machine.ts`): Formal FSM with `ALLOWED_TRANSITIONS`, `canTransition()`, `attemptTransition()`.
- **Status mapping** (`src/lib/lob.server.ts:mapLobStatusToOrderStatus()`): Maps Lob events to order statuses.
- **Order tracking page** (`src/routes/orders.$id.tsx`): Full order status display with timeline.
- **Order lookup** (`src/routes/orders.index.tsx`): Email recovery and order ID lookup.
- **Tests:** `tests/order-state-machine.test.mjs`

### Proof/Record Generation — COMPLETE
- **Proof of Service** (`src/lib/proof-of-service/`): Full module with hashing, custody chains, document registration, proof bundles, API auth.
- **Verification portal** (`src/routes/verify.tsx`): Public verification by tracking number and document hash.
- **Proof of mailing page** (`src/routes/proof-of-mailing.tsx`): Educational content about mailing records.
- **Lob bridge** (`src/lib/proof-of-service/lob-bridge.ts`): Connects proof-of-service to Lob webhook events.
- **Tests:** `tests/proof-of-service*.test.mjs` (4 test files)

### User/Account Flows — COMPLETE
- **Auth** (`src/routes/auth.tsx`): Supabase auth with redirect support.
- **Protected routes** (`src/routes/_authenticated/route.tsx`): `beforeLoad` checks auth, redirects to login.
- **Dashboard** (`src/routes/_authenticated/dashboard/index.tsx`): Shows stats, recent orders, ecosystem verticals, plan usage.
- **Order history** (`src/routes/_authenticated/dashboard/orders.tsx`): Paginated orders with status filter.
- **Admin dashboard** (`src/routes/_authenticated/admin/`): Revenue metrics, order search, failure tracking, provider health.
- **User profile** (`src/lib/user.functions.ts`): Profile CRUD with auth middleware.
- **Tests:** `tests/admin-dashboard.test.mjs`

### Security — COMPLETE
- **Auth middleware** (`src/integrations/supabase/auth-middleware.ts`): `requireSupabaseAuth` on all user functions.
- **Admin role check**: `assertAdmin()` on all admin functions.
- **Rate limiting**: Per-email and per-IP limits on order creation, recovery emails. Distributed rate limiting for Cloudflare Workers.
- **Input sanitization**: Address, email, filename, plain text sanitizers.
- **Webhook verification**: Both Stripe (SDK) and Lob (signature) webhooks verified.
- **PDF validation**: Security tokens blocked (JavaScript, Launch, embedded files).
- **Tests:** `tests/security-hardening.test.mjs`, `tests/webhook-security.test.mjs`, `tests/rate-limit.test.mjs`, `tests/hardening.test.mjs`

### Error Handling — COMPLETE
- **State machine**: Invalid transitions throw `InvalidTransitionError`.
- **Retry logic** (`src/lib/retry.ts`): Exponential backoff with jitter for Lob and Stripe calls.
- **Cleanup on failure**: DocumentService deletes uploaded files if order insert fails.
- **Error capture** (`src/lib/error-capture.ts`): SSR error capture with custom error page.
- **Lob submission failure**: Records event, leaves order in `paid_pending_manual_fulfillment` for manual review.

### SEO — COMPLETE
- Homepage, send, write, templates, ecosystem, proof-of-service, and 40+ SEO landing pages all have proper meta tags.
- Canonical URLs on all major pages.
- Schema.org structured data on homepage.
- Sitemap (`src/routes/sitemap.xml.ts`) includes static routes, live verticals, and SEO pages.
- Robots.txt (`src/routes/robots.txt.ts`) blocks API/admin/orders/auth paths.
- **Tests:** Implied by SEO landing pages and route tests.

### Analytics — COMPLETE
- **Client-side** (`src/lib/analytics.ts`): Consent management (GDPR), visitor/session IDs, event tracking to `/api/analytics/events`.
- **Funnel events** (`src/lib/analytics-events.ts`): Typed events for page views, template views, checkout, mailing success, proof views, repeat orders, Pro subscription.
- **Consent banner** (`src/components/analytics-consent.tsx`): GDPR consent UI.
- **Server-side** (`src/lib/admin-analytics.functions.ts`): Analytics event storage and querying.

### Ecosystem/Vertical Routing — COMPLETE
- **Ecosystem definitions** (`src/lib/ecosystem.ts`): 5 verticals (appeal-reply, notice-respond, immigration-mail, records-request, mail-pdf) with workflows.
- **Vertical registry** (`src/verticals/registry.ts`): 10 first-generation verticals with status, routes, capabilities.
- **Ecosystem page** (`src/routes/ecosystem.tsx`): Full listing of all verticals with workflow directories.
- **Solutions page** (`src/routes/solutions.tsx`): Legacy vertical navigation.
- **Solution redirects**: `/solutions/$verticalSlug` redirects to canonical vertical routes.
- **Tests:** `tests/vertical-routing-integrity.test.mjs`

### Production Deployment — COMPLETE
- **Cloudflare Workers** deployment via `deploy.sh`.
- Nitro preset: `cloudflare_module`.
- Cron triggers every 5 minutes for scheduled jobs.
- Environment variables for all secrets (Stripe, Lob, Supabase, Resend).
- Build passes (`npm run build`).

### Tests — PARTIAL
- **31 test files** covering pricing, state machine, security, webhooks, admin, verticals, proof-of-service, retention, rate limiting, observability, providers.
- **492/493 tests pass.** 1 pre-existing failure: `AIWorkflow` interface not defined in `src/verticals/types.ts`.
- Tests are source-file assertion tests (read file, check for patterns) — not integration/E2E tests.
- No browser-based E2E tests.

### Documentation — PARTIAL
- README.md covers features, pricing, architecture, routes.
- 20+ docs in `docs/` directory covering architecture, SEO, ecosystem, proof-of-service, retention, integrations.
- No API reference doc (proof-of-service has one).
- No CONTRIBUTING.md.

---

## 3. Partial Capabilities (PARTIAL)

### Repeat-Mail / History Reorder — PARTIAL
- Order history is viewable in dashboard (`/dashboard/orders`).
- Order tracking page (`/orders/$id`) shows full status.
- **Gap:** No "mail again" / reorder button exists. Users cannot re-send a previous document or duplicate a past order. The `MAIL_AGAIN_CLICKED` and `REPEAT_ORDER` analytics events are defined but never triggered.

### Email Notifications — PARTIAL
- Transactional emails (payment confirmation, mailed notification, order recovery) are implemented in `src/lib/email.server.ts`.
- Uses Resend API with idempotency checks.
- **Gap:** Email is feature-flagged and no-ops when `RESEND_API_KEY` is not configured. Depends on environment setup.

### Bulk Mailing — PARTIAL
- Full UI and server functions exist (`src/routes/bulk.tsx`, `src/lib/bulk-orders.functions.ts`).
- CSV recipient upload, preview, and checkout flow implemented.
- **Gap:** No specific tests for bulk order flow.

---

## 4. Broken Capabilities (BROKEN)

### AIWorkflow Interface — BROKEN (P0)
- `src/verticals/types.ts` has a comment header `// ── AI Workflow Interface ──` but the `AIWorkflow` interface is never defined.
- `src/verticals/index.ts` exports `AIWorkflow` from `./types` — TypeScript resolves this as `any` at runtime, but the test `tests/vertical-registry.test.mjs:98` asserts `typesSource.includes("AIWorkflow")` which fails.
- `src/lib/ai-workflow.ts` imports and uses `AIWorkflow` type — works at runtime because TS erases types, but the missing interface means no type safety on AI workflow implementations.
- **Test failure:** 1/493 tests fail (`defines AIWorkflow interface with all methods`).

---

## 5. Missing Capabilities (NOT IMPLEMENTED)

### E2E / Integration Tests — NOT IMPLEMENTED
- All tests are source-file pattern matching or pure logic tests.
- No browser-based E2E tests (Playwright, Cypress, etc.).
- No integration tests that exercise the full flow (upload → pay → Lob → webhook → tracking).

### Scheduled Delivery UI — NOT IMPLEMENTED
- `scheduled_delivery_date` field exists in DB and is handled by `getDueScheduledOrders()` in Lob server.
- Feature flag `FEATURE_FLAG_SCHEDULED_DELIVERY` exists.
- **Gap:** No UI in the send/write flow for users to pick a delivery date (only future-self has scheduling).

### Admin Manual Fulfillment — NOT IMPLEMENTED
- Orders that fail Lob submission land in `paid_pending_manual_fulfillment`.
- Admin dashboard shows failures.
- **Gap:** No admin UI to manually retry submission or mark as fulfilled.

---

## 6. Critical Blockers

### P0: Missing `AIWorkflow` interface in `src/verticals/types.ts`
**Impact:** 1 test fails. The `AIWorkflow` type is imported by `ai-workflow.ts` and exported by `verticals/index.ts`, but the interface definition is missing from `types.ts`. This is a type-safety gap and a test failure.
**Fix:** Add the `AIWorkflow` interface (and related types `AIWorkflowInput`, `AIAnalysisResult`, `AIExtractedFacts`, `AIDraftInput`, `AIDraftResult`, `AIValidationInput`, `AIValidationResult`, `AIReviseInput`) to `src/verticals/types.ts`.

---

## 7. Recommended Build Order

| Priority | Item | Effort |
|----------|------|--------|
| **P0** | Fix missing `AIWorkflow` interface in `types.ts` | Small |
| **P1** | Add "Mail Again" / reorder functionality on order page | Medium |
| **P1** | Admin manual fulfillment retry UI | Medium |
| **P2** | E2E integration tests for core mailing flow | Large |
| **P2** | Scheduled delivery date picker in send/write flows | Medium |
| **P3** | Bulk mailing tests | Small |
| **P3** | API reference documentation | Medium |

---

## 8. Tests Currently Passing

```
# tests 493
# pass 492
# fail 1
```

**Failing test:** `tests/vertical-registry.test.mjs` → "defines AIWorkflow interface with all methods"

**Test files (31):**
admin-dashboard, application-services, checkout-boundary, config-validation, dispute-mail, domain-models, feature-flags, growth-simulation, hardening, lob-hardening, observability, order-state-machine, payment-fulfillment-boundary, phase2-services, phase2-wiring, pricing-surcharge, proof-of-service-address-verification, proof-of-service-client, proof-of-service-integration, proof-of-service-rate-limits, proof-of-service, providers, rate-limit, security-hardening, stripe-production, supabase-fetch-headers, upload-retention-boundary, vertical-pricing, vertical-registry, vertical-routing-integrity, webhook-security

---

## 9. Deployment Status

- **Platform:** Cloudflare Workers (cloudflare_module preset)
- **Worker name:** mailmypdf
- **URL:** https://mailmypdf.mycomind4.workers.dev
- **Cron:** Every 5 minutes (proof processor, webhook retries, window expiry)
- **Build:** `npm run build` passes (Nitro + Vite)
- **Deploy:** `./deploy.sh` (requires `CLOUDFLARE_API_TOKEN`)
- **Dependencies:** Supabase (database + storage), Stripe (payments), Lob (mailing), Resend (email, optional)

---

## 10. Recommended Next Milestone

**Fix the P0 blocker** (missing `AIWorkflow` interface), then proceed to P1 items:

1. **P0:** Add `AIWorkflow` and related interfaces to `src/verticals/types.ts` → 493/493 tests pass
2. **P1:** "Mail Again" reorder button on order tracking page
3. **P1:** Admin manual fulfillment retry UI for stuck orders
4. **P2:** E2E test for the core flow (upload → pay → mock Lob → webhook → tracking)
