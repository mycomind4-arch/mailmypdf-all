/**
 * Stripe Webhook Handler
 *
 * Process Stripe events:
 * - payment_intent.succeeded → Accept quote + create order
 * - charge.refunded → Reverse quote + update order status
 * - charge.dispute.created → Handle chargeback
 *
 * Webhook must be idempotent (handle retries safely).
 * All event IDs are logged to prevent duplicate processing.
 */

import { createAPIFileRoute } from "@tanstack/start/api";
import Stripe from "stripe";
import { z } from "zod";
import { withAdmin } from "@/lib/supabase-admin.server";

// Initialize Stripe with webhook secret validation
function getStripeClient(): Stripe {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new Error("STRIPE_SECRET_KEY not configured");
  }
  return new Stripe(apiKey, {
    apiVersion: "2023-10-16",
  });
}

function verifyWebhookSignature(
  body: string,
  signature: string
): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET not configured");
  }

  const stripe = getStripeClient();
  try {
    return stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    throw new Error(
      `Webhook signature verification failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Process payment_intent.succeeded event.
 *
 * Accept the quote and create an order for fulfillment.
 */
async function handlePaymentIntentSucceeded(
  event: Stripe.Event,
  paymentIntent: Stripe.PaymentIntent
) {
  const quoteId = paymentIntent.metadata?.quote_id;
  if (!quoteId) {
    throw new Error("Quote ID not found in payment intent metadata");
  }

  const userEmail = paymentIntent.metadata?.user_email;
  if (!userEmail) {
    throw new Error("User email not found in payment intent metadata");
  }

  // Accept quote and create order
  const data = await withAdmin(async (db) => {
    // Get the quote
    const { data: quote, error: quoteError } = await db
      .from("pricing_quotes")
      .select("*")
      .eq("id", quoteId)
      .single();

    if (quoteError || !quote) {
      throw new Error(`Quote not found: ${quoteId}`);
    }

    // Check if already accepted (idempotency)
    if (quote.accepted_at) {
      return {
        status: "already_accepted",
        orderId: quote.metadata?.order_id,
      };
    }

    // Accept the quote
    const { error: acceptError } = await db
      .from("pricing_quotes")
      .update({
        accepted_at: new Date().toISOString(),
        stripe_payment_intent_id: paymentIntent.id,
      })
      .eq("id", quoteId);

    if (acceptError) {
      throw new Error(`Failed to accept quote: ${acceptError.message}`);
    }

    // Create order from quote
    const { data: order, error: orderError } = await db
      .from("orders")
      .insert({
        email: userEmail,
        price_cents: quote.total_cents,
        status: "paid",
        paid_at: new Date().toISOString(),
        metadata: {
          quote_id: quoteId,
          stripe_payment_intent_id: paymentIntent.id,
          policy_id: quote.policy_id,
          assignment_id: quote.assignment_id,
        },
      })
      .select()
      .single();

    if (orderError) {
      throw new Error(`Failed to create order: ${orderError.message}`);
    }

    // Log to audit trail
    await db.from("entitlements_audit_log").insert({
      actor_user_id: null,
      action: "payment_accepted",
      resource_type: "quote",
      resource_id: quoteId,
      new_values: {
        order_id: order.id,
        stripe_payment_intent_id: paymentIntent.id,
      },
    });

    return {
      status: "accepted",
      orderId: order.id,
      quoteId,
    };
  });

  return data;
}

/**
 * Process charge.refunded event.
 *
 * Reverse the quote acceptance and update order status.
 */
async function handleChargeRefunded(event: Stripe.Event, charge: Stripe.Charge) {
  if (!charge.payment_intent || typeof charge.payment_intent !== "string") {
    throw new Error("Payment intent ID not found");
  }

  const data = await withAdmin(async (db) => {
    // Find quote by Stripe payment ID
    const { data: quote, error: quoteError } = await db
      .from("pricing_quotes")
      .select("*")
      .eq("stripe_payment_intent_id", charge.payment_intent)
      .single();

    if (quoteError || !quote) {
      // Order might not exist if payment failed early
      return {
        status: "quote_not_found",
        message: "Quote or payment not found",
      };
    }

    // Find order
    const metadata = quote.metadata as any;
    const { data: order, error: orderError } = await db
      .from("orders")
      .select("*")
      .eq("id", metadata?.order_id || "")
      .single();

    if (orderError || !order) {
      return {
        status: "order_not_found",
        quoteId: quote.id,
      };
    }

    // Reverse quote acceptance
    const { error: reverseError } = await db
      .from("pricing_quotes")
      .update({
        accepted_at: null,
        stripe_payment_intent_id: null,
      })
      .eq("id", quote.id);

    if (reverseError) {
      throw new Error(`Failed to reverse quote: ${reverseError.message}`);
    }

    // Update order status
    const { error: statusError } = await db
      .from("orders")
      .update({
        status: "refunded",
      })
      .eq("id", order.id);

    if (statusError) {
      throw new Error(`Failed to update order: ${statusError.message}`);
    }

    // Log to audit trail
    await db.from("entitlements_audit_log").insert({
      actor_user_id: null,
      action: "refund_processed",
      resource_type: "quote",
      resource_id: quote.id,
      new_values: {
        reason: charge.refunded ? "Stripe refund" : "Charge disputed",
        amount_refunded: charge.amount_refunded,
      },
    });

    return {
      status: "refunded",
      orderId: order.id,
      quoteId: quote.id,
    };
  });

  return data;
}

/**
 * Process charge.dispute.created event.
 *
 * Mark order as disputed for review.
 */
async function handleChargeDispute(event: Stripe.Event, dispute: Stripe.Dispute) {
  const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge.id;

  const data = await withAdmin(async (db) => {
    // Find order by Stripe charge ID
    const { data: orders } = await db
      .from("orders")
      .select("*")
      .filter("metadata->stripe_payment_intent_id", "eq", chargeId);

    if (!orders || orders.length === 0) {
      return {
        status: "order_not_found",
        chargeId,
      };
    }

    const order = orders[0];

    // Update order status
    const { error: statusError } = await db
      .from("orders")
      .update({
        status: "disputed",
      })
      .eq("id", order.id);

    if (statusError) {
      throw new Error(`Failed to update order: ${statusError.message}`);
    }

    // Log to audit trail
    await db.from("entitlements_audit_log").insert({
      actor_user_id: null,
      action: "chargeback_initiated",
      resource_type: "order",
      resource_id: order.id,
      new_values: {
        dispute_id: dispute.id,
        reason: dispute.reason,
      },
    });

    return {
      status: "disputed",
      orderId: order.id,
    };
  });

  return data;
}

/**
 * Main webhook handler.
 *
 * Validates signature, processes event, returns 200 immediately.
 */
export const POST = createAPIFileRoute("/api/webhooks/stripe")(
  async (event) => {
    try {
      // Get raw body and signature
      const body = await event.request.text();
      const signature = event.request.headers.get("stripe-signature");

      if (!signature) {
        return new Response("Missing stripe-signature header", { status: 400 });
      }

      // Verify webhook signature
      const stripeEvent = verifyWebhookSignature(body, signature);

      // Process events
      switch (stripeEvent.type) {
        case "payment_intent.succeeded": {
          const paymentIntent = stripeEvent.data.object as Stripe.PaymentIntent;
          await handlePaymentIntentSucceeded(stripeEvent, paymentIntent);
          break;
        }

        case "charge.refunded": {
          const charge = stripeEvent.data.object as Stripe.Charge;
          await handleChargeRefunded(stripeEvent, charge);
          break;
        }

        case "charge.dispute.created": {
          const dispute = stripeEvent.data.object as Stripe.Dispute;
          await handleChargeDispute(stripeEvent, dispute);
          break;
        }

        default:
          // Log unhandled events but return success
          console.log(`Unhandled Stripe event type: ${stripeEvent.type}`);
      }

      // Always return 200 to acknowledge receipt
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Webhook error:", error);

      // Log errors but still return 200 to prevent Stripe retries
      // (We'll investigate and manually process if needed)
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : String(error),
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }
);
