/**
 * StateMachineService — atomic state transitions with event recording.
 *
 * Wraps the order-state-machine.ts logic to provide a single method
 * that validates a transition, updates the database, and records the
 * corresponding event — all as one atomic operation.
 *
 * This replaces the scattered pattern of:
 *   1. Check canTransition()
 *   2. UPDATE orders SET status = ...
 *   3. INSERT INTO order_events ...
 *
 * With:
 *   await stateMachine.transitionOrder(orderId, targetStatus, { triggeredBy: ... })
 *
 * The conditional UPDATE ensures atomicity: if the status changed between
 * the read and write, the update affects 0 rows and we return a conflict.
 */

import {
  attemptTransition,
  type OrderStatus,
  type TransitionContext,
  type TransitionResult,
  InvalidTransitionError,
} from "@/lib/order-state-machine";
import { EventHistoryService } from "./event-history.service";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TransitionParams {
  /** Who or what triggered the transition. */
  triggeredBy: TransitionContext["triggeredBy"];
  /** Additional metadata to store with the event. */
  metadata?: Record<string, unknown>;
  /** Additional fields to update alongside the status (e.g., lob_letter_id). */
  extraUpdate?: Record<string, unknown>;
  /** Optional label override (defaults to the state machine's label). */
  labelOverride?: string;
}

export interface TransitionOutcome {
  ok: boolean;
  from: OrderStatus;
  to: OrderStatus;
  event: string;
  label: string;
  /** True if the DB update succeeded. False means race condition. */
  persisted: boolean;
  /** True if the event was deduplicated (already recorded). */
  deduplicated: boolean;
  error?: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

export class StateMachineService {
  private events: EventHistoryService;

  constructor(events?: EventHistoryService) {
    this.events = events ?? new EventHistoryService();
  }

  /**
   * Transition an order to a new status.
   *
   * Steps:
   * 1. Fetch the current order status from the DB
   * 2. Validate the transition via the state machine
   * 3. Conditionally update the status (atomic — only if current status matches)
   * 4. Record the transition event
   *
   * Returns the outcome — check `ok` and `persisted` for the result.
   */
  async transitionOrder(
    orderId: string,
    to: OrderStatus,
    params: TransitionParams,
  ): Promise<TransitionOutcome> {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Fetch current status
    const { data: order, error: fetchError } = await supabaseAdmin
      .from("orders")
      .select("status")
      .eq("id", orderId)
      .maybeSingle();

    if (fetchError || !order) {
      return {
        ok: false,
        from: "draft" as OrderStatus,
        to,
        event: "transition.error",
        label: "Order not found",
        persisted: false,
        deduplicated: false,
        error: fetchError?.message ?? "Order not found",
      };
    }

    const from = order.status as OrderStatus;

    // 2. Validate the transition
    const result = attemptTransition({
      from,
      to,
      triggeredBy: params.triggeredBy,
      metadata: params.metadata,
    });

    if (!result.ok) {
      return {
        ok: false,
        from,
        to,
        event: result.event,
        label: result.label,
        persisted: false,
        deduplicated: false,
        error: result.label,
      };
    }

    // 3. Conditional update (atomic — only succeeds if status hasn't changed)
    const updatePayload: Record<string, unknown> = {
      status: to,
      ...params.extraUpdate,
    };

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("orders")
      .update(updatePayload)
      .eq("id", orderId)
      .eq("status", from)
      .select("id");

    if (updateError || !updated || updated.length === 0) {
      // Race condition — status changed between read and write
      return {
        ok: false,
        from,
        to,
        event: "transition.conflict",
        label: `Status changed before transition could complete (${from} → ${to})`,
        persisted: false,
        deduplicated: false,
        error: "Race condition: status changed before transition",
      };
    }

    // 4. Record the event
    const externalId = params.metadata?.external_id as string | undefined;
    let deduplicated = false;

    if (externalId) {
      const dedup = await this.events.recordEventIdempotent(
        orderId,
        result.event,
        params.labelOverride ?? result.label,
        externalId,
        params.metadata,
      );
      deduplicated = dedup.deduplicated;
    } else {
      await this.events.recordEvent({
        orderId,
        type: result.event,
        label: params.labelOverride ?? result.label,
        metadata: params.metadata,
      });
    }

    return {
      ok: true,
      from,
      to,
      event: result.event,
      label: params.labelOverride ?? result.label,
      persisted: true,
      deduplicated,
    };
  }

  /**
   * Transition an order, throwing on failure.
   * Use when you expect the transition to succeed and want to bubble errors.
   */
  async transitionOrThrow(
    orderId: string,
    to: OrderStatus,
    params: TransitionParams,
  ): Promise<TransitionOutcome> {
    const result = await this.transitionOrder(orderId, to, params);
    if (!result.ok || !result.persisted) {
      throw new InvalidTransitionError(result.from, result.to, result.error);
    }
    return result;
  }

  /**
   * Get the current status of an order.
   */
  async getStatus(orderId: string): Promise<OrderStatus | null> {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("orders")
      .select("status")
      .eq("id", orderId)
      .maybeSingle();
    return (data?.status as OrderStatus) ?? null;
  }

  /**
   * Get the event history service (for direct event queries).
   */
  getEvents(): EventHistoryService {
    return this.events;
  }
}
