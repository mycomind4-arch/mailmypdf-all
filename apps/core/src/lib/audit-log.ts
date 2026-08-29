/**
 * Structured audit logging for sensitive operations.
 *
 * Records security-relevant actions to the database (order_events table)
 * and structured logs, providing a tamper-evident trail for:
 * - Order status changes (payment, fulfillment, refunds)
 * - Admin actions (manual fulfillment, status overrides)
 * - Authentication events (admin login, token usage)
 * - Webhook processing (Stripe, Lob)
 * - Failed authorization attempts
 * - PII access (order details, addresses)
 *
 * Audit events are stored in the order_events table with type prefix "audit."
 * and also logged via the structured logging module.
 */

import { logWebhook } from "@/lib/request-logging";

export type AuditAction =
  | "order.status_changed"
  | "order.payment_received"
  | "order.payment_failed"
  | "order.refund_created"
  | "order.refund_completed"
  | "order.lob_submitted"
  | "order.lob_failed"
  | "order.manual_fulfillment"
  | "admin.login_attempt"
  | "admin.login_success"
  | "admin.login_failed"
  | "admin.order_viewed"
  | "admin.order_status_override"
  | "webhook.stripe_verified"
  | "webhook.stripe_rejected"
  | "webhook.lob_verified"
  | "webhook.lob_rejected"
  | "auth.token_used"
  | "auth.token_invalid"
  | "auth.rate_limited"
  | "security.header_applied"
  | "security.invalid_input"
  | "cleanup.drafts_deleted";

export type AuditLevel = "info" | "warn" | "error" | "critical";

export interface AuditEntry {
  action: AuditAction;
  level: AuditLevel;
  actor?: string; // user ID, IP, or "system"
  orderId?: string;
  description: string;
  metadata?: Record<string, unknown>;
}

/**
 * Record an audit event.
 * Stores in order_events table (if orderId is available) and logs structured.
 */
export async function audit(entry: AuditEntry): Promise<void> {
  // Always log structured
  logWebhook({
    provider: "audit",
    eventType: entry.action,
    orderId: entry.orderId,
    message: entry.description,
    level: entry.level === "critical" ? "error" : entry.level,
    metadata: {
      actor: entry.actor ?? "system",
      ...entry.metadata,
    },
  });

  // Store in database if we have an order ID
  if (entry.orderId) {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("order_events").insert({
        order_id: entry.orderId,
        type: `audit.${entry.action}`,
        label: entry.description,
        metadata: {
          level: entry.level,
          actor: entry.actor ?? "system",
          timestamp: new Date().toISOString(),
          ...entry.metadata,
        },
      });
    } catch (e) {
      // Don't let audit logging failures break the operation
      // But log a warning so we know audit is degraded
      console.warn(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "warn",
        provider: "audit",
        message: `audit log write failed: ${e instanceof Error ? e.message : String(e)}`,
      }));
    }
  }
}

/**
 * Audit a status transition with before/after context.
 */
export async function auditStatusChange(
  orderId: string,
  fromStatus: string,
  toStatus: string,
  actor: string,
  reason?: string,
): Promise<void> {
  await audit({
    action: "order.status_changed",
    level: "info",
    actor,
    orderId,
    description: `Status changed: ${fromStatus} → ${toStatus}`,
    metadata: { fromStatus, toStatus, reason },
  });
}

/**
 * Audit an admin action.
 */
export async function auditAdminAction(
  action: AuditAction,
  actor: string,
  description: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await audit({
    action,
    level: action.includes("failed") || action.includes("invalid") ? "warn" : "info",
    actor,
    description,
    metadata,
  });
}

/**
 * Audit a failed authorization attempt.
 */
export async function auditAuthFailure(
  actor: string,
  reason: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await audit({
    action: "auth.token_invalid",
    level: "warn",
    actor,
    description: `Authorization failed: ${reason}`,
    metadata,
  });
}

/**
 * Audit rate limiting enforcement.
 */
export async function auditRateLimit(
  key: string,
  bucket: string,
  actor: string,
): Promise<void> {
  await audit({
    action: "auth.rate_limited",
    level: "warn",
    actor,
    description: `Rate limit exceeded: ${bucket}:${key}`,
    metadata: { bucket, key },
  });
}
