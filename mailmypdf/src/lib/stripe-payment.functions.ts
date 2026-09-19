/**
 * Stripe Payment Integration Server Functions (Phase 3)
 *
 * Handles:
 * - Creating checkout sessions from quotes
 * - Validating quotes before payment
 * - Processing successful payments
 * - Handling refunds
 * - Managing payment metadata
 *
 * All operations are server-only and fully audited.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequest } from "@tanstack/react-start/server";
import Stripe from "stripe";
import type { Database, Json } from "@/integrations/supabase/types";
import { getSupabaseServer } from "@/lib/user-client.server";
import { getSupabaseAdmin, logAuditEntry } from "@/lib/supabase-admin.server";

function quoteMetadata(value: Json | null): { [key: string]: Json | undefined } {
  if (value === null) return {};
  if (typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid quote metadata");
  return value;
}

// Initialize only on the server when an operation actually needs Stripe.
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Payment processing is not configured");
  return new Stripe(key);
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const CreateCheckoutSessionSchema = z.object({
  quoteId: z.string().uuid(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

const ProcessPaymentSchema = z.object({
  paymentIntentId: z.string(),
  quoteId: z.string().uuid(),
});

const CreateRefundSchema = z.object({
  orderId: z.string().uuid(),
  reason: z.enum(["requested_by_customer", "duplicate", "fraudulent", "other"]),
  reasonText: z.string().optional(),
});

// ============================================================================
// CREATE CHECKOUT SESSION
// ============================================================================

/**
 * Create a Stripe checkout session from a pricing quote.
 *
 * Validates:
 * - Quote exists and belongs to user
 * - Quote hasn't expired
 * - Quote is in pending status
 *
 * Returns checkout URL for client to redirect to.
 */
export const createCheckoutSession = createServerFn({ method: "POST" })
  .validator(CreateCheckoutSessionSchema)
  .handler(async ({ data: input }) => {
    const request = getRequest();

    try {
      const validInput = CreateCheckoutSessionSchema.parse(input);

      const authHeader = request.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        throw new Error("Unauthorized");
      }

      const token = authHeader.slice(7);
      const supabase = await getSupabaseServer({ token });

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Unauthorized");
      }

      // ────────────────────────────────────────────────────────────────
      // Step 1: Get and validate quote
      // ────────────────────────────────────────────────────────────────

      const { data: quote, error: quoteError } = await supabase
        .from("pricing_quotes")
        .select("*")
        .eq("id", validInput.quoteId)
        .eq("user_id", user.id)
        .single();

      if (quoteError || !quote) {
        throw new Error("Quote not found or access denied");
      }

      // Validate quote status
      if (quote.status !== "pending") {
        throw new Error(`Quote is ${quote.status}, cannot checkout with non-pending quote`);
      }

      // Validate expiration
      const expiresAt = new Date(quote.expires_at);
      if (expiresAt < new Date()) {
        throw new Error("Quote has expired");
      }

      // ────────────────────────────────────────────────────────────────
      // Step 2: Get user email for receipt
      // ────────────────────────────────────────────────────────────────

      const { data: authUser } = await supabase.auth.getUser();
      const userEmail = authUser.user?.email || "customer@mailmypdf.com";

      // ────────────────────────────────────────────────────────────────
      // Step 3: Create Stripe checkout session
      // ────────────────────────────────────────────────────────────────

      const lineItems = [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${quote.vertical_id} - ${quote.workflow_id}`,
              description: `Workflow quote #${quote.id.slice(0, 8)}`,
              metadata: {
                quote_id: quote.id,
                workflow_id: quote.workflow_id,
                vertical_id: quote.vertical_id,
              },
            },
            unit_amount: Math.round(quote.total_cents),
          },
          quantity: 1,
        },
      ];

      const session = await getStripe().checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        customer_email: userEmail,
        success_url: validInput.successUrl,
        cancel_url: validInput.cancelUrl,
        line_items: lineItems,
        metadata: {
          quote_id: quote.id,
          user_id: user.id,
          workflow_id: quote.workflow_id,
          vertical_id: quote.vertical_id,
        },
        client_reference_id: quote.id,
        // Payment intent data for webhook processing
        payment_intent_data: {
          metadata: {
            quote_id: quote.id,
            user_id: user.id,
          },
        },
      });

      // ────────────────────────────────────────────────────────────────
      // Step 4: Store session reference in quote metadata
      // ────────────────────────────────────────────────────────────────

      const admin = getSupabaseAdmin();
      await admin
        .from("pricing_quotes")
        .update({
          metadata: {
            ...quoteMetadata(quote.metadata),
            stripe_session_id: session.id,
            checkout_started_at: new Date().toISOString(),
          },
        })
        .eq("id", quote.id);

      // Log to audit trail
      await logAuditEntry({
        actor: user.id,
        action: "quote_created",
        resourceType: "quote",
        resourceId: quote.id,
        changes: { stripe_session_id: session.id },
        reason: "Checkout session created",
      });

      return {
        success: true,
        sessionId: session.id,
        checkoutUrl: session.url,
        message: "Checkout session created successfully",
      };
    } catch (error) {
      console.error("Error creating checkout session:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create checkout session",
      };
    }
  });

// ============================================================================
// PROCESS PAYMENT (Webhook Handler)
// ============================================================================

/**
 * Process successful Stripe payment via webhook.
 * Called by Stripe when payment_intent.succeeded event occurs.
 *
 * Updates quote status to "accepted" and logs payment.
 */
export async function handleStripePaymentSuccess(
  paymentIntentId: string,
  quoteId: string,
  amount: number
) {
  const admin = getSupabaseAdmin();

  // Get quote
  const { data: quote, error: quoteError } = await admin
    .from("pricing_quotes")
    .select("*")
    .eq("id", quoteId)
    .single();

  if (quoteError || !quote) {
    throw new Error(`Quote ${quoteId} not found`);
  }

  // Verify amount matches quote
  if (amount !== quote.total_cents) {
    throw new Error(
      `Payment amount ${amount} does not match quote amount ${quote.total_cents}`
    );
  }

  // Update quote status
  const { error: updateError } = await admin
    .from("pricing_quotes")
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
      metadata: {
        ...quoteMetadata(quote.metadata),
        stripe_payment_intent_id: paymentIntentId,
        payment_processed_at: new Date().toISOString(),
      },
    })
    .eq("id", quoteId);

  if (updateError) {
    throw new Error(`Failed to update quote: ${updateError.message}`);
  }

  // Log payment success
  await logAuditEntry({
    actor: quote.user_id,
    action: "quote_accepted",
    resourceType: "quote",
    resourceId: quoteId,
    changes: {
      status: "accepted",
      stripe_payment_intent_id: paymentIntentId,
      amount: amount,
    },
    reason: "Payment processed successfully",
  });

  return { success: true, quoteId, paymentIntentId };
}

// ============================================================================
// CREATE REFUND
// ============================================================================

/**
 * Process refund for an order.
 * Links back to original quote for audit trail.
 *
 * Note: Assumes order has stripe_payment_intent_id in metadata
 */
export const createRefund = createServerFn({ method: "POST" })
  .validator(CreateRefundSchema)
  .handler(async ({ data: input }) => {
    const request = getRequest();

    try {
      const validInput = CreateRefundSchema.parse(input);

      const authHeader = request.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        throw new Error("Unauthorized");
      }

      const token = authHeader.slice(7);
      const supabase = await getSupabaseServer({ token });

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Unauthorized");
      }

      const admin = getSupabaseAdmin();

      // Get order (placeholder - would be from orders table in production)
      // For now, we'll assume order has a quote_id in metadata
      const { data: order } = await admin
        .from("pricing_quotes") // This would be 'orders' table
        .select("*")
        .eq("id", validInput.orderId)
        .eq("user_id", user.id)
        .single();

      if (!order) {
        throw new Error("Order not found");
      }

      const paymentIntentId =
        quoteMetadata(order.metadata).stripe_payment_intent_id;

      if (typeof paymentIntentId !== "string" || !paymentIntentId) {
        throw new Error("Order has no payment intent ID");
      }

      // Create refund via Stripe
      const refund = await getStripe().refunds.create({
        payment_intent: paymentIntentId,
        reason: validInput.reason === "other" ? undefined : validInput.reason,
        metadata: {
          order_id: validInput.orderId,
          user_id: user.id,
          reason_text: validInput.reasonText || "",
        },
      });

      // Mark quote as reversed in database
      await admin
        .from("pricing_quotes")
        .update({
          status: "reversed",
          metadata: {
            ...quoteMetadata(order.metadata),
            refund_id: refund.id,
            refunded_at: new Date().toISOString(),
            refund_reason: validInput.reason,
          },
        })
        .eq("id", validInput.orderId);

      // Log refund
      await logAuditEntry({
        actor: user.id,
        action: "quote_reversed",
        resourceType: "quote",
        resourceId: validInput.orderId,
        changes: {
          status: "reversed",
          refund_id: refund.id,
          refund_amount: refund.amount,
        },
        reason: `Refund processed: ${validInput.reason}`,
      });

      return {
        success: true,
        refundId: refund.id,
        amount: refund.amount,
        status: refund.status,
        message: "Refund processed successfully",
      };
    } catch (error) {
      console.error("Error creating refund:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create refund",
      };
    }
  });

// ============================================================================
// WEBHOOK HANDLER (Express endpoint)
// ============================================================================

/**
 * Stripe webhook handler for payment events.
 * Should be mounted at POST /api/webhooks/stripe
 *
 * Handles:
 * - charge.succeeded
 * - charge.failed
 * - charge.dispute.created
 * - payment_intent.succeeded
 *
 * Requires STRIPE_WEBHOOK_SECRET env var
 */
export async function handleStripeWebhook(req: Request) {
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return new Response("No stripe signature", { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const body = await req.text();
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ""
    );
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return new Response("Invalid signature", { status: 400 });
  }

  // Handle events
  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const quoteId = paymentIntent.metadata?.quote_id;

        if (quoteId) {
          await handleStripePaymentSuccess(
            paymentIntent.id,
            quoteId,
            paymentIntent.amount
          );
        }
        break;
      }

      case "charge.failed": {
        const charge = event.data.object as Stripe.Charge;
        console.error("Charge failed:", charge.id, charge.failure_message);
        // Could mark quote as failed or send customer notification
        break;
      }

      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute;
        console.warn("Dispute created:", dispute.id, dispute.reason);
        // Alert admin about dispute
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("Webhook processing error", { status: 500 });
  }
}

// ============================================================================
// RETRIEVE PAYMENT STATUS
// ============================================================================

/**
 * Check payment status for a quote.
 * Used after redirect from Stripe checkout.
 */
export const getPaymentStatus = createServerFn({ method: "POST" })
  .validator(z.object({ quoteId: z.string().uuid() }))
  .handler(async ({ data: input }) => {
    const request = getRequest();
    const { quoteId } = input;
    try {
      const authHeader = request.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        throw new Error("Unauthorized");
      }

      const token = authHeader.slice(7);
      const supabase = await getSupabaseServer({ token });

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Unauthorized");
      }

      const { data: quote, error } = await supabase
        .from("pricing_quotes")
        .select("*")
        .eq("id", quoteId)
        .eq("user_id", user.id)
        .single();

      if (error || !quote) {
        throw new Error("Quote not found");
      }

      return {
        success: true,
        quoteId: quote.id,
        status: quote.status,
        totalCents: quote.total_cents,
        acceptedAt: quote.accepted_at,
        metadata: {
          stripeSessionId: quoteMetadata(quote.metadata).stripe_session_id,
          stripePaymentIntentId: quoteMetadata(quote.metadata).stripe_payment_intent_id,
        },
      };
    } catch (error) {
      console.error("Error getting payment status:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get payment status",
      };
    }
  });
