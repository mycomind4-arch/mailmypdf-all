/**
 * Status Mapping — bridges the legacy OrderStatus enum and the new
 * MailJobStatus domain model.
 *
 * This file is the ONLY place that knows how to translate between the two.
 * Existing code continues to use OrderStatus (from the database enum);
 * new code (application services, domain logic) uses MailJobStatus.
 *
 * The mapping is many-to-one: multiple granular OrderStatus values map
 * to a single MailJobStatus. The reverse mapping picks the most
 * specific OrderStatus for a given MailJobStatus.
 */

import type { OrderStatus } from "@/lib/order-state-machine";
import type { MailJobStatus } from "@/domain/models";

// ── Forward: OrderStatus → MailJobStatus ─────────────────────────────────────

const ORDER_TO_MAILJOB: Record<OrderStatus, MailJobStatus> = {
  draft: "draft",
  uploaded: "draft",                // upload is part of the draft phase
  priced: "validated",               // priced = validated (address + PDF OK)
  checkout_created: "payment_pending",
  paid: "payment_complete",
  paid_pending_manual_fulfillment: "payment_complete",
  manual_fulfillment_in_progress: "queued",
  submitted_to_provider: "submitted",
  provider_processing: "accepted",
  mailed: "submitted",              // mailed but not yet accepted by carrier
  in_transit: "in_transit",
  delivered: "delivered",
  failed: "failed",
  failed_payment: "failed",
  failed_fulfillment: "failed",
  failed_provider_submission: "failed",
  cancelled: "cancelled",
  refunded: "refunded",
  returned: "completed",            // returned mail = completed (with return evidence)
};

/**
 * Map a legacy OrderStatus to the canonical MailJobStatus.
 * This is a pure function — no side effects.
 */
export function mapOrderStatusToMailJobStatus(
  orderStatus: OrderStatus,
): MailJobStatus {
  return ORDER_TO_MAILJOB[orderStatus] ?? "draft";
}

// ── Reverse: MailJobStatus → OrderStatus ─────────────────────────────────────

const MAILJOB_TO_ORDER: Record<MailJobStatus, OrderStatus> = {
  draft: "draft",
  validated: "priced",
  payment_pending: "checkout_created",
  payment_complete: "paid",
  queued: "paid_pending_manual_fulfillment",
  submitted: "submitted_to_provider",
  accepted: "provider_processing",
  in_transit: "in_transit",
  delivered: "delivered",
  completed: "delivered",
  archived: "delivered",            // archived is post-completion; DB stays "delivered"
  failed: "failed",
  cancelled: "cancelled",
  refunded: "refunded",
};

/**
 * Map a MailJobStatus back to the closest legacy OrderStatus.
 * Used when persisting domain state to the database.
 *
 * Note: "archived" maps to "delivered" because the database enum does
 * not have an "archived" value. Archival is tracked via a separate
 * flag or audit event, not via the status column.
 */
export function mapMailJobStatusToOrderStatus(
  mailJobStatus: MailJobStatus,
): OrderStatus {
  return MAILJOB_TO_ORDER[mailJobStatus] ?? "draft";
}

// ── Valid Transitions (MailJob domain) ───────────────────────────────────────

/**
 * Allowed state transitions for MailJobStatus.
 *
 * This mirrors the existing order-state-machine.ts transitions but
 * expressed in the cleaner domain vocabulary. The order state machine
 * remains the source of truth for database persistence; this table
 * is for domain-level validation in application services.
 */
export const MAILJOB_TRANSITIONS: Record<MailJobStatus, MailJobStatus[]> = {
  draft: ["validated", "failed", "cancelled"],
  validated: ["payment_pending", "cancelled"],
  payment_pending: ["payment_complete", "failed", "cancelled"],
  payment_complete: ["queued", "cancelled", "refunded"],
  queued: ["submitted", "failed", "cancelled"],
  submitted: ["accepted", "failed", "cancelled"],
  accepted: ["in_transit", "failed", "cancelled"],
  in_transit: ["delivered", "completed", "cancelled"],
  delivered: ["completed", "cancelled", "refunded"],
  completed: ["archived", "refunded"],
  archived: [],
  failed: ["draft", "cancelled"],    // retry or give up
  cancelled: [],
  refunded: [],
};

/**
 * Check whether a transition is allowed in the MailJob domain.
 */
export function canTransitionTo(
  from: MailJobStatus,
  to: MailJobStatus,
): boolean {
  const allowed = MAILJOB_TRANSITIONS[from] ?? [];
  return allowed.includes(to);
}
