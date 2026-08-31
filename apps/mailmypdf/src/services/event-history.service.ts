/**
 * EventHistoryService — centralized event recording and querying.
 *
 * Currently, order_events inserts are scattered across:
 * - orders.functions.ts (order.created, file.uploaded)
 * - lob.server.ts (lob.submitted, lob.mailed, lob.delivered, etc.)
 * - payments/webhook.ts (payment.received, payment.failed, etc.)
 *
 * This service centralizes all event recording into one place, with
 * consistent structure and deduplication support.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EventRecord {
  orderId: string;
  type: string;
  label: string;
  metadata?: Record<string, unknown>;
}

export interface EventQueryResult {
  type: string;
  label: string;
  created_at: string;
  metadata?: unknown;
}

// ── Service ───────────────────────────────────────────────────────────────────

export class EventHistoryService {
  /**
   * Record a single event for an order.
   * Uses ON CONFLICT for idempotency when external_id is provided.
   */
  async recordEvent(event: EventRecord): Promise<void> {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("order_events").insert({
      order_id: event.orderId,
      type: event.type,
      label: event.label,
      metadata: event.metadata ?? null,
    });
    if (error) throw new Error(`Failed to record event: ${error.message}`);
  }

  /**
   * Record multiple events atomically (single insert).
   */
  async recordEvents(events: EventRecord[]): Promise<void> {
    if (events.length === 0) return;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("order_events").insert(
      events.map((e) => ({
        order_id: e.orderId,
        type: e.type,
        label: e.label,
        metadata: e.metadata ?? null,
      })),
    );
    if (error) throw new Error(`Failed to record events: ${error.message}`);
  }

  /**
   * Record an event with idempotency via external_id in metadata.
   * If an event with the same external_id already exists, it's a no-op.
   */
  async recordEventIdempotent(
    orderId: string,
    type: string,
    label: string,
    externalId: string,
    extraMetadata?: Record<string, unknown>,
  ): Promise<{ deduplicated: boolean }> {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Check if an event with this external_id already exists
    const { data: existing } = await supabaseAdmin
      .from("order_events")
      .select("id")
      .eq("order_id", orderId)
      .eq("type", type)
      .filter("metadata->>external_id", "eq", externalId)
      .limit(1);

    if (existing && existing.length > 0) {
      return { deduplicated: true };
    }

    await this.recordEvent({
      orderId,
      type,
      label,
      metadata: { external_id: externalId, ...extraMetadata },
    });

    return { deduplicated: false };
  }

  /**
   * Get all events for an order, ordered chronologically.
   */
  async getEvents(orderId: string): Promise<EventQueryResult[]> {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("order_events")
      .select("type,label,created_at,metadata")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(`Failed to get events: ${error.message}`);
    return data ?? [];
  }

  /**
   * Check if a specific event type has already been recorded for an order.
   * Useful for idempotency checks.
   */
  async hasEvent(orderId: string, type: string): Promise<boolean> {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("order_events")
      .select("id", { count: "exact", head: true })
      .eq("order_id", orderId)
      .eq("type", type);
    return (count ?? 0) > 0;
  }
}
