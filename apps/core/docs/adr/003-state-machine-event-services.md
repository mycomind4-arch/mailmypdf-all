# ADR-003: State Machine Service and Event History Service

**Date:** 2026-08-02
**Status:** Accepted
**Phase:** Phase 2 — PR 4

## Context

The existing codebase handles state transitions and event recording in a
scattered, non-atomic way:

1. **Payment webhook** (`payments/webhook.ts`): reads order, checks status,
   does a conditional UPDATE, then manually INSERTs into `order_events`.
2. **Lob webhook** (`lob.server.ts`): looks up order by `lob_letter_id`,
   maps Lob status, does a direct UPDATE, then manually INSERTs events.
3. **Order creation** (`orders.functions.ts` / `mail.service.ts`): inserts
   the order row, then manually INSERTs `order.created` and `file.uploaded`
   events.

Each of these has its own idempotency logic, its own error handling, and its
own pattern for event recording. There's no centralized service that ensures
a transition is valid, atomic, and properly recorded.

## Decision

Create two new services:

### EventHistoryService (`event-history.service.ts`)
- `recordEvent()` — single event insert
- `recordEvents()` — batch insert (atomic)
- `recordEventIdempotent()` — checks `metadata->>external_id` before inserting
- `getEvents()` — chronological event history for an order
- `hasEvent()` — idempotency check

### StateMachineService (`state-machine.service.ts`)
- `transitionOrder()` — atomic transition: fetch → validate → conditional
  UPDATE → record event. Returns a `TransitionOutcome` with `ok`, `persisted`,
  and `deduplicated` flags.
- `transitionOrThrow()` — throws on failure (for cases where failure is
  unexpected)
- `getStatus()` — read current status
- Uses `attemptTransition()` from `order-state-machine.ts` for validation
- Uses `EventHistoryService` for event recording
- Handles race conditions gracefully (returns conflict, doesn't throw)

### TrackingService (`tracking.service.ts`)
- `processTrackingEvent()` — looks up order by `lob_letter_id`, maps Lob
  status to OrderStatus, transitions via StateMachineService
- Passes `signature_image_url` and `mailed_at` through to the DB update
- Uses `lob_webhook` as the trigger source

### Services Index (`index.ts`)
- Added singletons: `getStateMachineService()`, `getTrackingService()`
- TrackingService wired with StateMachineService dependency

## What This Enables

Future PRs can refactor `lob.server.ts` and `payments/webhook.ts` to use
these services instead of inline DB updates + event inserts. The transition
logic becomes:

```typescript
// Before (scattered, non-atomic):
const { data: updated } = await supabaseAdmin
  .from("orders")
  .update({ status: "paid_pending_manual_fulfillment" })
  .eq("id", orderId)
  .eq("status", "draft");
if (updated?.length === 1) {
  await supabaseAdmin.from("order_events").insert({
    order_id: orderId,
    type: "payment.received",
    label: "Payment received",
  });
}

// After (atomic, centralized):
const result = await getStateMachineService().transitionOrder(
  orderId,
  "paid_pending_manual_fulfillment",
  { triggeredBy: "stripe_webhook", metadata: { payment_intent: pi.id } },
);
```

## Consequences

- **New files only.** No existing files modified. The services are
  available for use but not yet wired into the webhook handlers.
- **Tests pass.** 379 tests (21 new Phase 2 contract tests).
- **Build passes.** No TypeScript errors.
- **Next PR** will wire the Lob webhook handler to use TrackingService and
  the payment webhook to use StateMachineService directly.

## Migration Note

**What changed:** Added 3 new service files + updated `index.ts` + 21 new tests.

**What to do:** Nothing. The services are additive. Existing webhook
handlers continue to work unchanged. They'll be migrated to use these
services in subsequent PRs.

**How to verify:** `npm test` (379 pass) and `npm run build` (no errors).
