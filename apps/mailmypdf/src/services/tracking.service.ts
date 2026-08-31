/**
 * TrackingService — handles mail tracking events from Lob webhooks.
 *
 * Wraps the existing mapLobStatusToOrderStatus + processLobWebhook logic
 * into a service that uses StateMachineService for atomic transitions.
 *
 * The Lob webhook handler (lob.server.ts) currently does:
 * 1. Parse the Lob event
 * 2. Look up the order by lob_letter_id
 * 3. Map the Lob status to an OrderStatus
 * 4. Update the order status directly
 * 5. Insert order_events
 *
 * This service replaces steps 3-5 with a single StateMachineService call.
 */

import { StateMachineService } from "./state-machine.service";
import type { OrderStatus } from "@/lib/order-state-machine";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TrackingEventInput {
  /** The Lob letter ID (e.g., ltr_xxxxx). */
  letterId: string;
  /** The raw Lob status string. */
  lobStatus: string;
  /** Lob's unique event ID (for idempotency). */
  externalEventId?: string | null;
  /** Signature image URL (from certified mail return receipt). */
  signatureImageUrl?: string | null;
  /** Additional metadata from the Lob event. */
  metadata?: Record<string, unknown>;
}

export interface TrackingResult {
  ok: boolean;
  orderId?: string;
  fromStatus?: OrderStatus;
  toStatus?: OrderStatus;
  deduplicated?: boolean;
  error?: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

export class TrackingService {
  private stateMachine: StateMachineService;

  constructor(stateMachine?: StateMachineService) {
    this.stateMachine = stateMachine ?? new StateMachineService();
  }

  /**
   * Process a tracking event from Lob.
   *
   * 1. Look up the order by lob_letter_id
   * 2. Map Lob status to OrderStatus
   * 3. Transition via StateMachineService (atomic + event recording)
   */
  async processTrackingEvent(event: TrackingEventInput): Promise<TrackingResult> {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { mapLobStatusToOrderStatus } = await import("@/lib/lob.server");

    // 1. Find the order
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("id, status")
      .eq("lob_letter_id", event.letterId)
      .maybeSingle();

    if (error) return { ok: false, error: error.message };
    if (!order) return { ok: false, error: `No order found for letter ${event.letterId}` };

    // 2. Map the Lob status
    const targetStatus = mapLobStatusToOrderStatus(event.lobStatus);
    if (!targetStatus || targetStatus === order.status) {
      return {
        ok: true,
        orderId: order.id,
        fromStatus: order.status as OrderStatus,
        toStatus: order.status as OrderStatus,
        deduplicated: true,
      };
    }

    // 3. Transition via state machine
    const extraUpdate: Record<string, unknown> = {};
    if (event.signatureImageUrl) {
      extraUpdate.signature_image_url = event.signatureImageUrl;
    }
    if (event.lobStatus === "mailed" || event.lobStatus === "in_transit") {
      // Don't overwrite mailed_at if already set
      const { data: existing } = await supabaseAdmin
        .from("orders")
        .select("mailed_at")
        .eq("id", order.id)
        .maybeSingle();
      if (!existing?.mailed_at) {
        extraUpdate.mailed_at = new Date().toISOString();
      }
    }

    const result = await this.stateMachine.transitionOrder(order.id, targetStatus, {
      triggeredBy: "lob_webhook",
      metadata: {
        lob_status: event.lobStatus,
        letter_id: event.letterId,
        external_id: event.externalEventId ?? undefined,
        signature_image_url: event.signatureImageUrl ?? undefined,
        ...event.metadata,
      },
      extraUpdate,
    });

    return {
      ok: result.ok,
      orderId: order.id,
      fromStatus: result.from,
      toStatus: result.to,
      deduplicated: result.deduplicated,
      error: result.error,
    };
  }
}
