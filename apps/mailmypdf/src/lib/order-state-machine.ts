/**
 * Order State Machine for MailMyPDF.
 *
 * Replaces scattered string-based status comparisons with a formal finite
 * state machine. Every status transition must go through `attemptTransition()`
 * — illegal transitions throw, and all transitions are logged.
 *
 * The state machine covers the full order lifecycle:
 *
 *   draft → checkout_created → paid_pending_manual_fulfillment → submitted_to_provider
 *     → provider_processing → mailed → in_transit → delivered
 *
 * Failure paths:
 *   draft → failed_payment
 *   paid_pending_manual_fulfillment → failed_fulfillment
 *   submitted_to_provider → failed_provider_submission
 *   any state → cancelled
 *   mailed/in_transit → returned
 *   delivered → returned
 *
 * Recovery paths:
 *   failed_fulfillment → paid_pending_manual_fulfillment (retry)
 *   failed_provider_submission → paid_pending_manual_fulfillment (retry)
 *
 * Refund path:
 *   any paid state → refunded
 *
 * Manual fallback:
 *   paid_pending_manual_fulfillment → manual_fulfillment_in_progress → submitted_to_provider
 */

import type { Database } from "@/integrations/supabase/types";

export type OrderStatus = Database["public"]["Enums"]["order_status"];

// ── Transition Definitions ────────────────────────────────────────────────────

export interface TransitionContext {
  /** The current status of the order. */
  from: OrderStatus;
  /** The desired next status. */
  to: OrderStatus;
  /** Who or what triggered the transition. */
  triggeredBy: "stripe_webhook" | "lob_webhook" | "auto_submit" | "admin" | "scheduled_job" | "system" | "user";
  /** Optional metadata about the transition. */
  metadata?: Record<string, unknown>;
}

export interface TransitionResult {
  ok: boolean;
  from: OrderStatus;
  to: OrderStatus;
  event: string;
  label: string;
  metadata?: Record<string, unknown>;
}

export class InvalidTransitionError extends Error {
  constructor(
    public readonly from: OrderStatus,
    public readonly to: OrderStatus,
    message?: string,
  ) {
    super(
      message ??
        `Invalid order transition: ${from} → ${to}. ` +
        `Allowed transitions from "${from}": ${ALLOWED_TRANSITIONS[from]?.join(", ") ?? "none"}`,
    );
    this.name = "InvalidTransitionError";
  }
}

// ── Transition Table ─────────────────────────────────────────────────────────

/**
 * Maps each status to the set of statuses it can transition TO.
 * This is the single source of truth for valid transitions.
 */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  // Legacy statuses (still in DB enum but superseded by more specific ones)
  paid: [
    "submitted_to_provider",
    "manual_fulfillment_in_progress",
    "failed_fulfillment",
    "cancelled",
    "refunded",
  ],
  failed: [
    "paid_pending_manual_fulfillment", // retry
    "cancelled",
    "refunded",
  ],
  draft: [
    "checkout_created",
    "failed_payment",
    "cancelled",
    "priced",
    "uploaded",
  ],
  uploaded: ["priced", "cancelled"],
  priced: ["checkout_created", "cancelled"],
  checkout_created: [
    "paid_pending_manual_fulfillment",
    "failed_payment",
    "cancelled",
    "draft", // user abandoned checkout
  ],
  paid_pending_manual_fulfillment: [
    "submitted_to_provider",
    "manual_fulfillment_in_progress",
    "failed_fulfillment",
    "cancelled",
    "refunded",
  ],
  manual_fulfillment_in_progress: [
    "submitted_to_provider",
    "failed_fulfillment",
    "cancelled",
    "refunded",
  ],
  submitted_to_provider: [
    "provider_processing",
    "failed_provider_submission",
    "cancelled",
    "refunded",
  ],
  provider_processing: [
    "mailed",
    "failed_provider_submission",
    "cancelled",
    "refunded",
  ],
  mailed: [
    "in_transit",
    "delivered",
    "returned",
    "refunded",
  ],
  in_transit: [
    "delivered",
    "returned",
    "refunded",
  ],
  delivered: [
    "returned",
    "refunded",
  ],
  returned: ["refunded"],
  failed_payment: ["draft", "cancelled"],
  failed_fulfillment: [
    "paid_pending_manual_fulfillment", // retry
    "manual_fulfillment_in_progress",
    "cancelled",
    "refunded",
  ],
  failed_provider_submission: [
    "paid_pending_manual_fulfillment", // retry
    "submitted_to_provider", // retry directly
    "manual_fulfillment_in_progress",
    "cancelled",
    "refunded",
  ],
  cancelled: ["refunded"],
  refunded: [],
};

// ── Transition Metadata ──────────────────────────────────────────────────────

interface TransitionDef {
  event: string;
  label: string;
}

/**
 * Metadata for each transition — the event type and human label to log
 * in order_events when this transition fires.
 */
const TRANSITION_METADATA: Record<string, TransitionDef> = {
  "draft→checkout_created": { event: "checkout.created", label: "Checkout session created" },
  "draft→failed_payment": { event: "payment.failed", label: "Payment failed" },
  "draft→priced": { event: "order.priced", label: "Order priced" },
  "draft→uploaded": { event: "file.uploaded", label: "File uploaded" },
  "draft→cancelled": { event: "order.cancelled", label: "Order cancelled" },
  "uploaded→priced": { event: "order.priced", label: "Order priced" },
  "uploaded→cancelled": { event: "order.cancelled", label: "Order cancelled" },
  "priced→checkout_created": { event: "checkout.created", label: "Checkout session created" },
  "priced→cancelled": { event: "order.cancelled", label: "Order cancelled" },
  "checkout_created→paid_pending_manual_fulfillment": { event: "payment.received", label: "Payment received" },
  "checkout_created→failed_payment": { event: "payment.failed", label: "Payment failed" },
  "checkout_created→draft": { event: "checkout.abandoned", label: "Checkout abandoned" },
  "checkout_created→cancelled": { event: "order.cancelled", label: "Order cancelled" },
  "paid_pending_manual_fulfillment→submitted_to_provider": { event: "lob.submitted", label: "Submitted to Lob for printing & mailing" },
  "paid_pending_manual_fulfillment→manual_fulfillment_in_progress": { event: "fulfillment.manual_started", label: "Manual fulfillment started" },
  "paid_pending_manual_fulfillment→failed_fulfillment": { event: "fulfillment.failed", label: "Fulfillment failed" },
  "paid_pending_manual_fulfillment→cancelled": { event: "order.cancelled", label: "Order cancelled" },
  "paid_pending_manual_fulfillment→refunded": { event: "order.refunded", label: "Order refunded" },
  "manual_fulfillment_in_progress→submitted_to_provider": { event: "lob.submitted", label: "Submitted to Lob (manual)" },
  "manual_fulfillment_in_progress→failed_fulfillment": { event: "fulfillment.failed", label: "Manual fulfillment failed" },
  "manual_fulfillment_in_progress→cancelled": { event: "order.cancelled", label: "Order cancelled" },
  "manual_fulfillment_in_progress→refunded": { event: "order.refunded", label: "Order refunded" },
  "submitted_to_provider→provider_processing": { event: "lob.processing", label: "Provider is processing" },
  "submitted_to_provider→failed_provider_submission": { event: "lob.submit_failed", label: "Lob submission failed" },
  "submitted_to_provider→cancelled": { event: "order.cancelled", label: "Order cancelled" },
  "submitted_to_provider→refunded": { event: "order.refunded", label: "Order refunded" },
  "provider_processing→mailed": { event: "lob.mailed", label: "Letter mailed" },
  "provider_processing→failed_provider_submission": { event: "lob.failed", label: "Provider processing failed" },
  "provider_processing→cancelled": { event: "order.cancelled", label: "Order cancelled" },
  "provider_processing→refunded": { event: "order.refunded", label: "Order refunded" },
  "mailed→in_transit": { event: "lob.in_transit", label: "Letter in transit" },
  "mailed→delivered": { event: "lob.delivered", label: "Letter delivered" },
  "mailed→returned": { event: "lob.returned", label: "Letter returned to sender" },
  "mailed→refunded": { event: "order.refunded", label: "Order refunded" },
  "in_transit→delivered": { event: "lob.delivered", label: "Letter delivered" },
  "in_transit→returned": { event: "lob.returned", label: "Letter returned to sender" },
  "in_transit→refunded": { event: "order.refunded", label: "Order refunded" },
  "delivered→returned": { event: "lob.returned", label: "Letter returned to sender" },
  "delivered→refunded": { event: "order.refunded", label: "Order refunded" },
  "returned→refunded": { event: "order.refunded", label: "Order refunded" },
  "failed_payment→draft": { event: "payment.retry", label: "Payment retry — order returned to draft" },
  "failed_payment→cancelled": { event: "order.cancelled", label: "Order cancelled" },
  "failed_fulfillment→paid_pending_manual_fulfillment": { event: "fulfillment.retry", label: "Fulfillment retry" },
  "failed_fulfillment→manual_fulfillment_in_progress": { event: "fulfillment.manual_started", label: "Manual fulfillment started" },
  "failed_fulfillment→cancelled": { event: "order.cancelled", label: "Order cancelled" },
  "failed_fulfillment→refunded": { event: "order.refunded", label: "Order refunded" },
  "failed_provider_submission→paid_pending_manual_fulfillment": { event: "fulfillment.retry", label: "Provider submission retry" },
  "failed_provider_submission→submitted_to_provider": { event: "lob.resubmitted", label: "Resubmitted to Lob" },
  "failed_provider_submission→manual_fulfillment_in_progress": { event: "fulfillment.manual_started", label: "Manual fulfillment started" },
  "failed_provider_submission→cancelled": { event: "order.cancelled", label: "Order cancelled" },
  "failed_provider_submission→refunded": { event: "order.refunded", label: "Order refunded" },
  "cancelled→refunded": { event: "order.refunded", label: "Order refunded" },
};

function transitionKey(from: OrderStatus, to: OrderStatus): string {
  return `${from}→${to}`;
}

// ── Transition Guards ─────────────────────────────────────────────────────────

export interface TransitionGuard {
  /** Returns true if the guard passes. */
  check: (ctx: TransitionContext) => boolean;
  /** Error message when the guard fails. */
  message: string;
}

const GUARDS: Record<string, TransitionGuard[]> = {
  "paid_pending_manual_fulfillment→submitted_to_provider": [
    {
      check: (ctx) => !ctx.metadata?.["lob_letter_id"] || typeof ctx.metadata["lob_letter_id"] === "string",
      message: "lob_letter_id must be a string when provided",
    },
  ],
  "checkout_created→paid_pending_manual_fulfillment": [
    {
      check: (ctx) => ctx.triggeredBy === "stripe_webhook",
      message: "Only Stripe webhook can mark an order as paid",
    },
  ],
  "draft→checkout_created": [
    {
      check: (ctx) => !!ctx.metadata?.["stripe_session_id"],
      message: "Stripe session ID required when creating checkout",
    },
  ],
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Validates that a transition is allowed and returns the event/label metadata.
 * Throws InvalidTransitionError if the transition is not in the allowed table.
 */
export function validateTransition(ctx: TransitionContext): TransitionResult {
  const key = transitionKey(ctx.from, ctx.to);
  const allowed = ALLOWED_TRANSITIONS[ctx.from];

  if (!allowed || !allowed.includes(ctx.to)) {
    throw new InvalidTransitionError(ctx.from, ctx.to);
  }

  // Run guards
  const guards = GUARDS[key];
  if (guards) {
    for (const guard of guards) {
      if (!guard.check(ctx)) {
        throw new InvalidTransitionError(ctx.from, ctx.to, `Guard failed: ${guard.message}`);
      }
    }
  }

  const meta = TRANSITION_METADATA[key];
  if (!meta) {
    // Transition is allowed but has no event metadata — log with generic event
    return {
      ok: true,
      from: ctx.from,
      to: ctx.to,
      event: `status.${ctx.to}`,
      label: `Status changed to ${ctx.to.replace(/_/g, " ")}`,
      metadata: ctx.metadata,
    };
  }

  return {
    ok: true,
    from: ctx.from,
    to: ctx.to,
    event: meta.event,
    label: meta.label,
    metadata: ctx.metadata,
  };
}

/**
 * Attempts a transition and returns the result. Does NOT throw on invalid
 * transitions — returns { ok: false } instead. Useful when you want to
 * gracefully handle invalid transitions without try/catch.
 */
export function attemptTransition(ctx: TransitionContext): TransitionResult {
  try {
    return validateTransition(ctx);
  } catch (e) {
    if (e instanceof InvalidTransitionError) {
      return {
        ok: false,
        from: ctx.from,
        to: ctx.to,
        event: "transition.invalid",
        label: e.message,
      };
    }
    throw e;
  }
}

/**
 * Returns true if the transition from → to is allowed by the state machine.
 */
export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  const allowed = ALLOWED_TRANSITIONS[from];
  return !!allowed && allowed.includes(to);
}

/**
 * Returns all valid next states from the given status.
 */
export function getNextStates(from: OrderStatus): OrderStatus[] {
  return ALLOWED_TRANSITIONS[from] ?? [];
}

/**
 * Returns true if the order is in a "terminal" state (no further transitions
 * except refund).
 */
export function isTerminalStatus(status: OrderStatus): boolean {
  const next = ALLOWED_TRANSITIONS[status] ?? [];
  // Terminal = only refund is possible, or nothing at all
  return next.length === 0 || (next.length === 1 && next[0] === "refunded");
}

/**
 * Returns true if the order is in a "paid" state (customer has been charged).
 */
export function isPaidStatus(status: OrderStatus): boolean {
  return [
    "paid_pending_manual_fulfillment",
    "manual_fulfillment_in_progress",
    "submitted_to_provider",
    "provider_processing",
    "mailed",
    "in_transit",
    "delivered",
    "returned",
    "refunded",
  ].includes(status);
}

/**
 * Returns true if the order is in a "failed" state.
 */
export function isFailedStatus(status: OrderStatus): boolean {
  return [
    "failed_payment",
    "failed_fulfillment",
    "failed_provider_submission",
  ].includes(status);
}

/**
 * Returns true if the order can be submitted to Lob (i.e., it's in a submittable state).
 */
export function isSubmittableStatus(status: OrderStatus): boolean {
  return [
    "paid_pending_manual_fulfillment",
    "failed_fulfillment",
    "failed_provider_submission",
    "manual_fulfillment_in_progress",
  ].includes(status);
}

/**
 * Returns true if the order can be refunded.
 */
export function isRefundableStatus(status: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[status]?.includes("refunded") ?? false;
}

/**
 * Returns the ordered fulfillment progress for display purposes.
 * Returns -1 for non-fulfillment statuses.
 */
export function getFulfillmentProgress(status: OrderStatus): number {
  const progress = [
    "paid_pending_manual_fulfillment",
    "submitted_to_provider",
    "provider_processing",
    "mailed",
    "in_transit",
    "delivered",
  ];
  return progress.indexOf(status);
}
