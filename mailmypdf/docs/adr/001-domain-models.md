# ADR-001: Introduce Domain Models Layer

**Date:** 2026-08-02
**Status:** Accepted
**Phase:** Phase 1 — Foundation

## Context

MailMyPDF's business logic is spread across `orders.functions.ts`, route
handlers, and `lob.server.ts` / `stripe.server.ts`. Types are derived from
the database schema (Supabase generated types) and vendor SDKs (Lob, Stripe).
There is no shared domain vocabulary — "order" is a database row, "letter"
is a Lob concept, and "checkout session" is a Stripe concept.

The modernization plan calls for a **Document Operations Platform** where
the same infrastructure handles certified mail, court documents, tenant
notices, and future FairProcess integrations. This requires a domain layer
that is vendor-agnostic and reusable across workflows.

## Decision

Introduce a **domain models layer** at `src/domain/` with:

- **`models.ts`** — Pure type definitions (interfaces, not classes) for the
  canonical domain vocabulary: `MailJob`, `Document`, `Recipient`, `Address`,
  `Pricing`, `PaymentInfo`, `TrackingInfo`, `TrackingEvent`, `AuditEvent`,
  `ProofOfMailing`, `Organization`, and supporting types.

- **`status-mapping.ts`** — A bidirectional mapping between the new
  `MailJobStatus` (14 states) and the legacy `OrderStatus` (18 states from
  the Supabase enum). This is the ONLY place that knows the translation.
  Existing code continues using `OrderStatus`; new code uses `MailJobStatus`.

- **`index.ts`** — Public API barrel export.

### Design Rules

1. **Domain models are pure types.** No behavior, no constructors, no
   dependencies on external packages. They are `import type` only.

2. **Vendor-agnostic.** No Lob, Stripe, or Supabase types appear in the
   domain models. `PostalAddress` from the provider interfaces is similar
   to `Address` but they are separate — the domain `Address` includes
   verification status and corrections that belong to the application.

3. **Backwards-compatible.** Nothing existing changes. The new types sit
   alongside the existing code. Application services (PR 2) will adopt them;
   routes (PR 3) will adopt the services.

4. **MailJobStatus is many-to-one over OrderStatus.** Multiple granular
   legacy states (e.g., `failed`, `failed_payment`, `failed_fulfillment`)
   map to a single clean domain state (`failed`). The reverse mapping picks
   the most specific legacy state for persistence.

5. **Transitions are defined but not yet enforced.** The `MAILJOB_TRANSITIONS`
   table and `canTransitionTo()` function provide domain-level validation,
   but the existing `order-state-machine.ts` remains the source of truth
   for database writes. Application services will use both.

## Consequences

- **New code** (application services, controllers) will reference
  `@/domain` types instead of database rows or vendor SDKs.
- **Existing code** is unchanged — no imports modified, no tests broken.
- **The mapping layer** (`status-mapping.ts`) is the bridge. If a new
  status is added to either enum, the mapping must be updated.
- **Future PRs** will build on this foundation: application services
  will accept/return `MailJob` objects, and routes will orchestrate services
  rather than calling `lob.server.ts` or `stripe.server.ts` directly.

## Migration Note

**What changed:** Added `src/domain/` with 3 new files. No existing files
were modified.

**What to do:** Nothing. This is an additive change. Existing routes,
services, and tests continue to work exactly as before. The domain models
will be adopted incrementally in subsequent PRs.

**How to verify:** `npm test` (346 tests pass, including 35 new domain
model tests) and `npm run build` (no TypeScript errors).
