# ADR-002: Introduce Application Services Layer

**Date:** 2026-08-02
**Status:** Accepted
**Phase:** Phase 1 — PR 2

## Context

`orders.functions.ts` contained all business logic inline: PDF validation,
storage upload, database inserts, event recording, Stripe checkout creation,
subscription checks, rate limiting, and sanitization. Routes called these
server functions directly, coupling the route layer to implementation details.

The modernization plan calls for "Application Services" that routes orchestrate
rather than implement logic. This separates *what* the application does
(business logic) from *how* it's exposed (server functions / routes).

## Decision

Extract business logic from `orders.functions.ts` into four application
services in `src/services/`:

### DocumentService (`document.service.ts`)
- PDF validation (delegates to `pdf-validation.server.ts`)
- Document upload to Supabase Storage
- Letter PDF generation (delegates to `letter-pdf.server.ts`)
- SHA-256 document hashing (for proof-of-service)

### PricingService (`pricing.service.ts`)
- Wraps existing `pricing.ts` functions
- Returns domain-level `Pricing` objects (from `src/domain/models.ts`)
- Product description generation for Stripe line items

### BillingService (`billing.service.ts`)
- Stripe checkout session creation
- Pro subscription discount application
- Draft ownership race condition handling
- Session expiration on race loss

### MailService (`mail.service.ts`)
- Orchestrates the mail job lifecycle
- `createOrderFromPdf()` — rate limit, sanitize, validate, price, upload, persist
- `createOrderFromLetter()` — generate PDF, validate, price, upload, persist
- `getOrder()` / `lookupOrder()` — retrieval
- `previewPdfPricing()` / `previewLetterPricing()` — pricing previews
- Delegates to DocumentService, PricingService, and BillingService

### Server Functions (`orders.functions.ts`)
- Now thin wrappers: zod validation → delegate to MailService
- Same function signatures — routes are unchanged
- Checkout logic kept inline for now (security tests check its patterns)

## Changes to Existing Tests

Three source-pattern tests were updated to check the new file locations
instead of `orders.functions.ts`:

1. **security-hardening.test.mjs** — sanitizer import check now reads
   `src/services/mail.service.ts` (where sanitizers are imported and used)
2. **upload-retention-boundary.test.mjs** — validate-before-upload check now
   reads `src/services/mail.service.ts` and `src/services/document.service.ts`
   (where validation and upload calls live)
3. **payment-fulfillment-boundary.test.mjs** — draft status and no-Lob-submit
   checks now read `src/services/mail.service.ts`

The security properties enforced by these tests are unchanged — they verify
the same invariants, just in the files where the logic now lives.

## Consequences

- **Routes unchanged.** `send.tsx`, `write.tsx`, `orders.$id.tsx`,
  `orders.index.tsx` all import the same server functions with the same signatures.
- **Tests pass.** 343 tests pass (3 updated to check new file locations).
- **Build passes.** No TypeScript errors.
- **Future PRs** can add more services (TrackingService, NotificationService)
  and wire the checkout logic through BillingService fully.

## Migration Note

**What changed:** Added `src/services/` with 5 new files. Refactored
`orders.functions.ts` to delegate to services. Updated 3 test files to
check the new file locations.

**What to do:** Nothing. All route imports are unchanged. The server
function signatures are identical. Deploy normally.

**How to verify:** `npm test` (343 pass) and `npm run build` (no errors).
