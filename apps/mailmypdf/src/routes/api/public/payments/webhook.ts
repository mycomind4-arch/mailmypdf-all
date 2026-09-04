/**
 * Stripe webhook handler — production-hardened.
 *
 * Uses the Stripe SDK's constructEvent() for webhook verification
 * (replaces the hand-rolled HMAC implementation in stripe.server.ts).
 *
 * Key hardening:
 * - SDK-based signature verification (tolerance built-in)
 * - Event ID deduplication (prevents duplicate processing on retry)
 * - Metadata integrity checks (orderId present and matches DB)
 * - Refund event handling (refund.created, refund.updated)
 * - Structured logging via request-logging module
 * - Idempotent order status transitions via state machine
 */

import { createFileRoute } from "@tanstack/react-router";
import { createStripeClient, getStripeEnvironment, getMailMyPdfBaseUrl, getStripeErrorMessage } from "@/lib/stripe.server";
import { sendPaymentConfirmationEmail } from "@/lib/email.server";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { getOrCreateRequestId, attachRequestId, createRequestLogger } from "@/lib/request-id";
import { canTransition, type OrderStatus } from "@/lib/order-state-machine";
import { logWebhook } from "@/lib/request-logging";
import { audit, auditAuthFailure } from "@/lib/audit-log";
import { recordPaymentOutcome, recordWebhookProcessingTime } from "@/lib/metrics";
import { withRetry } from "@/lib/retry";

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * A single-order checkout carries orderId. A bulk checkout carries isBulk,
 * orderIds and bulkOrderId instead — see the metadata written in
 * src/lib/bulk-orders.functions.ts. Stripe metadata values are always strings.
 */
interface CheckoutSessionMetadata {
  orderId?: string;
  isBulk?: string;
  orderIds?: string;
  bulkOrderId?: string;
}

interface StripeCheckoutSession {
  id: string;
  metadata: CheckoutSessionMetadata | null;
  amount_total: number | null;
  payment_intent?: string | null;
  last_payment_error?: { message?: string } | null;
}

interface StripePaymentIntent {
  id: string;
  metadata: { orderId?: string } | null;
  last_payment_error?: { message?: string } | null;
  amount: number;
  status: string;
}

interface StripeRefundEvent {
  id: string;
  amount: number;
  status: string;
  payment_intent: string | null;
  reason?: string | null;
  metadata?: { orderId?: string } | null;
}

type WebhookObject = StripeCheckoutSession | StripePaymentIntent | StripeRefundEvent;

function getOrderId(obj: WebhookObject): string | null {
  return obj?.metadata?.orderId ?? null;
}

// ── SDK Webhook Verification ───────────────────────────────────────────────────

/**
 * Verify a Stripe webhook using the SDK's constructEvent().
 * This replaces the hand-rolled HMAC verification with the official
 * SDK method, which handles:
 * - Signature parsing and comparison
 * - Timestamp tolerance (5 min default)
 * - Replay attack prevention
 */
async function verifyWebhookWithSdk(
  req: Request,
  log: ReturnType<typeof createRequestLogger>,
): Promise<{ event: any; raw: string }> {
  const signature = req.headers.get("stripe-signature");
  const raw = await req.text();
  if (!signature || !raw) throw new Error("Missing signature or body");

  const secret = getStripeWebhookSecret();
  const client = createStripeClient();

  let event: any;
  try {
    event = client.webhooks.constructEvent(raw, signature, secret);
  } catch (e) {
    log.error("Stripe webhook signature verification failed", {
      error: e instanceof Error ? e.message : String(e),
    });
    throw new Error(`Webhook signature verification failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  return { event, raw };
}

function getStripeWebhookSecret(): string {
  const env = getStripeEnvironment();
  if (env === "sandbox") {
    const secret = process.env.PAYMENTS_SANDBOX_WEBHOOK_SECRET;
    if (!secret) throw new Error("PAYMENTS_SANDBOX_WEBHOOK_SECRET not configured");
    return secret;
  }
  const secret = process.env.PAYMENTS_LIVE_WEBHOOK_SECRET;
  if (!secret) throw new Error("PAYMENTS_LIVE_WEBHOOK_SECRET not configured");
  return secret;
}

// ── Event Deduplication ───────────────────────────────────────────────────────

/**
 * Check if a Stripe event has already been processed.
 * Uses order_events table with (order_id, type, metadata.external_id).
 */
async function isDuplicateEvent(
  orderId: string,
  eventType: string,
  externalId: string,
): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: existing } = await supabaseAdmin
    .from("order_events")
    .select("id")
    .eq("order_id", orderId)
    .eq("type", eventType)
    .contains("metadata", { external_id: externalId })
    .limit(1)
    .maybeSingle();
  return !!existing;
}

/**
 * Record a processed Stripe event for deduplication.
 */
async function recordProcessedEvent(
  orderId: string,
  eventType: string,
  externalId: string,
  label: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("order_events").insert({
    order_id: orderId,
    type: eventType,
    label,
    metadata: { external_id: externalId, ...metadata },
  });
}

// ── Handlers ──────────────────────────────────────────────────────────────────

async function markOrderPaid(
  session: StripeCheckoutSession,
  requestOrigin: string,
  log: ReturnType<typeof createRequestLogger>,
  eventId: string,
): Promise<void> {
  // ── Check for bulk order ────────────────────────────────────────────────
  const metadata = session.metadata ?? {};
  if (metadata.isBulk === "true" && metadata.orderIds) {
    const orderIds: string[] = metadata.orderIds.split(",").filter(Boolean);
    const bulkOrderId = metadata.bulkOrderId ?? "unknown";
    log.info("processing bulk order payment", { bulkOrderId, orderCount: orderIds.length, sessionId: session.id, eventId });

    if (await isDuplicateEvent(bulkOrderId, "payment.received", eventId)) {
      log.info("duplicate bulk checkout.session.completed — skipping", { bulkOrderId, eventId });
      return;
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Mark each order as paid individually (using orderIds from metadata)
    const updatedOrders: { id: string }[] = [];
    for (const orderId of orderIds) {
      const { data: updated, error: updateErr } = await supabaseAdmin
        .from("orders")
        .update({
          status: "paid_pending_manual_fulfillment",
          paid_at: new Date().toISOString(),
          stripe_session_id: session.id ?? null,
        })
        .eq("id", orderId)
        .eq("status", "draft")
        .select("id");
      if (updateErr) {
        log.error("failed to mark bulk order paid", { orderId, error: updateErr.message, eventId });
        continue;
      }
      if (updated && updated.length > 0) {
        updatedOrders.push(updated[0]);
      }
    }

    if (updatedOrders.length === 0) {
      log.info("bulk orders already processed — idempotent no-op", { bulkOrderId, eventId });
      return;
    }

    log.info("bulk orders marked paid", { bulkOrderId, count: updatedOrders.length, eventId });

    // Record events for all orders
    for (const order of updatedOrders) {
      await recordProcessedEvent(order.id, "payment.received", eventId, "Payment received (bulk)", {
        stripe_session_id: session.id,
        bulk_order_id: bulkOrderId,
      });
      await supabaseAdmin.from("order_events").insert({
        order_id: order.id,
        type: "order.pending_fulfillment",
        label: "Preparing for mailing",
      });
    }

    logWebhook({
      provider: "stripe",
      eventType: "checkout.session.completed",
      externalId: eventId,
      message: `bulk payment received — ${updatedOrders.length} letters — $${((session.amount_total ?? 0) / 100).toFixed(2)}`,
      level: "info",
      metadata: { bulkOrderId, count: updatedOrders.length, amountCents: session.amount_total },
    });

    // Send confirmation email (use first order)
    await sendPaymentConfirmationEmail(supabaseAdmin, updatedOrders[0].id, requestOrigin);

    // Auto-submit all orders to Lob
    try {
      const { submitOrderToLob } = await import("@/lib/lob.server");
      const { flags } = await import("@/lib/feature-flags");
      if (flags.isAutoSubmitEnabled() && flags.isLobEnabled()) {
        let submitted = 0;
        for (const order of updatedOrders) {
          try {
            await submitOrderToLob(order.id);
            submitted++;
          } catch (e) {
            log.error("bulk auto-submit to Lob failed", { orderId: order.id, error: e instanceof Error ? e.message : String(e) });
          }
        }
        log.info("bulk auto-submitted to Lob", { bulkOrderId, submitted, total: updatedOrders.length });
      }
    } catch (e) {
      log.error("bulk Lob submission error", { bulkOrderId, error: e instanceof Error ? e.message : String(e) });
    }
    return;
  }

  // ── Single order (existing flow) ───────────────────────────────────────
  const orderId = getOrderId(session);
  if (!orderId) {
    log.error("checkout session missing metadata.orderId", { sessionId: session.id, eventId });
    logWebhook({
      provider: "stripe",
      eventType: "checkout.session.completed",
      externalId: eventId,
      message: "missing metadata.orderId — cannot process",
      level: "error",
      metadata: { sessionId: session.id },
    });
    return;
  }

  // Dedup check
  if (await isDuplicateEvent(orderId, "payment.received", eventId)) {
    log.info("duplicate checkout.session.completed — skipping", { orderId, eventId });
    logWebhook({
      provider: "stripe",
      eventType: "checkout.session.completed",
      orderId,
      externalId: eventId,
      message: "duplicate event — skipping",
      level: "info",
    });
    return;
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Verify metadata integrity: check the order exists and is in a draft state
  const { data: order, error: orderErr } = await supabaseAdmin
    .from("orders")
    .select("id, status")
    .eq("id", orderId)
    .maybeSingle();
  if (orderErr || !order) {
    log.error("order not found for webhook", { orderId, error: orderErr?.message, eventId });
    logWebhook({
      provider: "stripe",
      eventType: "checkout.session.completed",
      orderId,
      externalId: eventId,
      message: `order not found — skipping`,
      level: "error",
    });
    return;
  }

  // Conditional update: only transition if status is still 'draft'
  // This is the idempotency guard — if a previous webhook already processed it,
  // this update returns 0 rows.
  const { data: updated, error: updateErr } = await supabaseAdmin
    .from("orders")
    .update({
      status: "paid_pending_manual_fulfillment",
      paid_at: new Date().toISOString(),
      stripe_session_id: session.id ?? null,
    })
    .eq("id", orderId)
    .eq("status", "draft")
    .select("id");

  if (updateErr) {
    log.error("failed to mark paid", { orderId, error: updateErr.message, eventId });
    return;
  }

  if (!updated || updated.length === 0) {
    // Already paid or in a further state — idempotent no-op, but ensure email is sent
    log.info("order already processed — idempotent no-op", { orderId, eventId, currentStatus: order.status });
    await sendPaymentConfirmationEmail(supabaseAdmin, orderId, requestOrigin);
    return;
  }

  // Record the payment event
  await recordProcessedEvent(orderId, "payment.received", eventId, "Payment received", {
    stripe_session_id: session.id,
    amount_total: session.amount_total,
    payment_intent: session.payment_intent ?? null,
  });

  await supabaseAdmin.from("order_events").insert({
    order_id: orderId,
    type: "order.pending_fulfillment",
    label: "Preparing for mailing",
  });

  logWebhook({
    provider: "stripe",
    eventType: "checkout.session.completed",
    orderId,
    externalId: eventId,
    message: `payment received — $${((session.amount_total ?? 0) / 100).toFixed(2)}`,
    level: "info",
    metadata: { amountCents: session.amount_total, sessionId: session.id },
  });

  audit({
    action: "order.payment_received",
    level: "info",
    actor: "stripe-webhook",
    orderId,
    description: `Payment received: $${((session.amount_total ?? 0) / 100).toFixed(2)}`,
    metadata: { stripeSessionId: session.id, amountCents: session.amount_total },
  });

  recordPaymentOutcome(true, session.amount_total ?? 0);

  await sendPaymentConfirmationEmail(supabaseAdmin, orderId, requestOrigin);

  // Fire-and-forget auto-submit to Lob if enabled
  try {
    const { submitOrderToLob } = await import("@/lib/lob.server");
    const { flags } = await import("@/lib/feature-flags");
    if (flags.isAutoSubmitEnabled() && flags.isLobEnabled()) {
      await submitOrderToLob(orderId);
      log.info("auto-submitted to Lob", { orderId });
    }
  } catch (e) {
    log.error("auto-submit to Lob failed", { orderId, error: e instanceof Error ? e.message : String(e) });
  }
}

async function markOrderFailed(
  sessionOrIntent: WebhookObject,
  log: ReturnType<typeof createRequestLogger>,
  eventId: string,
): Promise<void> {
  const orderId = getOrderId(sessionOrIntent);
  if (!orderId) return;

  // Dedup check
  if (await isDuplicateEvent(orderId, "payment.failed", eventId)) {
    log.info("duplicate payment.failed event — skipping", { orderId, eventId });
    return;
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  await recordProcessedEvent(orderId, "payment.failed", eventId, "Payment failed", {
    reason: (sessionOrIntent as StripePaymentIntent).last_payment_error?.message ?? null,
  });

  logWebhook({
    provider: "stripe",
    eventType: "payment.failed",
    orderId,
    externalId: eventId,
    message: `payment failed: ${(sessionOrIntent as StripePaymentIntent).last_payment_error?.message ?? "unknown"}`,
    level: "warn",
  });
}

async function handleRefundEvent(
  refund: StripeRefundEvent,
  log: ReturnType<typeof createRequestLogger>,
  eventId: string,
): Promise<void> {
  const orderId = getOrderId(refund) ?? null;

  // If no orderId in metadata, try to find the order by payment_intent
  let resolvedOrderId = orderId;
  if (!resolvedOrderId && refund.payment_intent) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Check order_events for the payment_intent reference
    const { data: event } = await supabaseAdmin
      .from("order_events")
      .select("order_id")
      .contains("metadata", { payment_intent: refund.payment_intent })
      .limit(1)
      .maybeSingle();
    resolvedOrderId = event?.order_id ?? null;
  }

  if (!resolvedOrderId) {
    log.warn("refund event — could not resolve order", { refundId: refund.id, paymentIntent: refund.payment_intent });
    logWebhook({
      provider: "stripe",
      eventType: "refund.created",
      externalId: eventId,
      message: "could not resolve order for refund — manual review needed",
      level: "warn",
    });
    return;
  }

  // Dedup check
  if (await isDuplicateEvent(resolvedOrderId, `refund.${refund.status}`, eventId)) {
    log.info("duplicate refund event — skipping", { orderId: resolvedOrderId, eventId });
    return;
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // If the refund succeeded, transition the order to refunded.
  // Uses StateMachineService for an atomic conditional update + event recording.
  // The canTransition pre-check is kept for clarity and test visibility.
  if (refund.status === "succeeded") {
    const currentStatus = await getOrderStatus(supabaseAdmin, resolvedOrderId);
    if (currentStatus && canTransition(currentStatus, "refunded")) {
      const { getStateMachineService } = await import("@/services");
      const result = await getStateMachineService().transitionOrder(
        resolvedOrderId,
        "refunded",
        {
          triggeredBy: "stripe_webhook",
          metadata: {
            refund_id: refund.id,
            amount: refund.amount,
            reason: refund.reason,
            external_id: eventId,
          },
        },
      );
      if (!result.ok) {
        log.warn("state machine transition to refunded failed", {
          orderId: resolvedOrderId,
          from: result.from,
          to: result.to,
          error: result.error,
          eventId,
        });
      }
    }
  }

  await recordProcessedEvent(resolvedOrderId, `refund.${refund.status}`, eventId, `Refund ${refund.status}`, {
    refund_id: refund.id,
    amount: refund.amount,
    reason: refund.reason,
    payment_intent: refund.payment_intent,
  });

  logWebhook({
    provider: "stripe",
    eventType: `refund.${refund.status}`,
    orderId: resolvedOrderId,
    externalId: eventId,
    message: `refund ${refund.status}: $${(refund.amount / 100).toFixed(2)}`,
    level: "info",
    metadata: { refundId: refund.id, amount: refund.amount },
  });
}

async function getOrderStatus(supabase: any, orderId: string): Promise<OrderStatus | null> {
  const { data } = await supabase.from("orders").select("status").eq("id", orderId).maybeSingle();
  return (data?.status as OrderStatus) ?? null;
}

// ── Route ─────────────────────────────────────────────────────────────────────

async function handleWebhook(req: Request, log: ReturnType<typeof createRequestLogger>) {
  // Use SDK verification instead of hand-rolled HMAC
  const { event } = await verifyWebhookWithSdk(req, log);
  const origin = getMailMyPdfBaseUrl();

  log.info("webhook received", { type: event.type, eventId: event.id });

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      await markOrderPaid(event.data.object as StripeCheckoutSession, origin, log, event.id);
      break;

    case "checkout.session.async_payment_failed":
    case "payment_intent.payment_failed":
      await markOrderFailed(event.data.object as StripePaymentIntent, log, event.id);
      break;

    case "charge.refunded":
    case "refund.created":
    case "refund.updated":
      await handleRefundEvent(event.data.object as StripeRefundEvent, log, event.id);
      break;

    // ── Subscription lifecycle events ────────────────────────────────────────
    case "customer.subscription.created": {
      const sub = event.data.object as any;
      log.info("subscription created", { subscriptionId: sub.id, customerEmail: sub.metadata?.email ?? "unknown" });
      break;
    }
    case "customer.subscription.updated": {
      const sub = event.data.object as any;
      log.info("subscription updated", { subscriptionId: sub.id, status: sub.status });
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as any;
      log.info("subscription canceled", { subscriptionId: sub.id, status: sub.status });
      break;
    }
    case "invoice.payment_succeeded": {
      const invoice = event.data.object as any;
      log.info("subscription payment succeeded", { invoiceId: invoice.id, subscriptionId: invoice.subscription ?? null });
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as any;
      log.warn("subscription payment failed", { invoiceId: invoice.id, subscriptionId: invoice.subscription ?? null });
      break;
    }
    default:
      log.info("unhandled event", { type: event.type, eventId: event.id });
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const requestId = getOrCreateRequestId(request);
        const log = createRequestLogger(requestId);

        // Rate limit webhook endpoint (Stripe retries, so be generous)
        const clientIp = getClientIp(request);
        const rl = rateLimit(clientIp, "stripe-webhook", { maxRequests: 100, windowMs: 60_000 });
        if (!rl.allowed) {
          log.warn("rate limited", { ip: clientIp });
          const resp = new Response("Too many requests", { status: 429 });
          return attachRequestId(resp, requestId);
        }

        try {
          await handleWebhook(request, log);
          const resp = Response.json({ received: true });
          return attachRequestId(resp, requestId);
        } catch (e) {
          log.error("webhook error", { error: e instanceof Error ? e.message : String(e) });
          logWebhook({
            provider: "stripe",
            eventType: "error",
            message: `webhook processing error: ${e instanceof Error ? e.message : String(e)}`,
            level: "error",
          });
          const resp = new Response("Webhook error", { status: 400 });
          return attachRequestId(resp, requestId);
        }
      },
    },
  },
});
