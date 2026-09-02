/**
 * Checkout Server Functions
 *
 * Handle quote retrieval and Stripe checkout session creation.
 * These run server-side with full access to database and Stripe API.
 */

import { createServerFn } from "@tanstack/start";
import { z } from "zod";
import { withAdmin } from "./supabase-admin.server";

/**
 * Get a pricing quote by ID for display on checkout page.
 */
export const getPricingQuote = createServerFn({
  method: "POST",
  async handler(ctx) {
    const body = z.object({ quoteId: z.string().uuid() }).parse(ctx.data);

    const data = await withAdmin(async (db) => {
      const { data: quote, error } = await db
        .from("pricing_quotes")
        .select("*")
        .eq("id", body.quoteId)
        .single();

      if (error || !quote) {
        throw new Error("Quote not found or expired");
      }

      // Check if already accepted
      if (quote.accepted_at) {
        throw new Error("This quote has already been paid. Please create a new order.");
      }

      // Check expiration (30 minutes)
      const createdAt = new Date(quote.created_at);
      const expiresAt = new Date(createdAt.getTime() + 30 * 60 * 1000);
      if (new Date() > expiresAt) {
        throw new Error("Quote expired. Please request a new quote.");
      }

      return {
        id: quote.id,
        total: quote.total_cents,
        lineItems: quote.line_items || [],
        pricingPolicySlug: quote.policy_id,
        expiresAt: expiresAt.toISOString(),
        createdAt: quote.created_at,
      };
    });

    return data;
  },
});

/**
 * Create a Stripe checkout session for a quote.
 *
 * This generates the payment form URL that redirects to Stripe Checkout.
 * The quote ID is stored in metadata so the webhook can accept it after payment.
 */
export const getCheckoutSession = createServerFn({
  method: "POST",
  async handler(ctx) {
    const userEmail = ctx.request?.headers.get("x-user-email");
    if (!userEmail) {
      throw new Error("User email not found");
    }

    const body = z.object({
      quoteId: z.string().uuid(),
      totalCents: z.number().int().positive(),
    }).parse(ctx.data);

    // Validate quote exists and is still valid
    const quote = await getPricingQuote.fetch({ quoteId: body.quoteId });

    if (quote.total !== body.totalCents) {
      throw new Error("Quote amount mismatch. Please refresh and try again.");
    }

    // Create Stripe checkout session
    const { createCheckoutSession } = await import("./stripe.server");
    const session = await createCheckoutSession({
      quoteId: body.quoteId,
      totalCents: body.totalCents,
      userEmail,
      successUrl: `${process.env.MAILMYPDF_BASE_URL || "http://localhost:8080"}/checkout/success`,
      cancelUrl: `${process.env.MAILMYPDF_BASE_URL || "http://localhost:8080"}/checkout/cancel`,
    });

    return {
      sessionId: session.id,
      clientSecret: session.client_secret,
      userEmail,
    };
  },
});

/**
 * Verify payment intent and accept quote.
 *
 * Called after successful Stripe payment.
 * This locks the quote to the order and initiates fulfillment.
 */
export const verifyPaymentAndAcceptQuote = createServerFn({
  method: "POST",
  async handler(ctx) {
    const body = z.object({
      quoteId: z.string().uuid(),
      paymentIntentId: z.string(),
    }).parse(ctx.data);

    const { acceptQuoteAfterPayment } = await import("./stripe.server");

    const result = await acceptQuoteAfterPayment({
      quoteId: body.quoteId,
      stripePaymentIntentId: body.paymentIntentId,
      userEmail: ctx.request?.headers.get("x-user-email") || "",
    });

    return {
      quoteId: result.quote.id,
      orderId: result.order.id,
      total: result.order.price_cents,
      status: "accepted",
    };
  },
});

/**
 * Get order details after successful payment.
 *
 * Used on success page to show order confirmation.
 */
export const getOrderAfterPayment = createServerFn({
  method: "POST",
  async handler(ctx) {
    const userEmail = ctx.request?.headers.get("x-user-email");
    if (!userEmail) {
      throw new Error("Unauthorized");
    }

    const body = z.object({ orderId: z.string() }).parse(ctx.data);

    const data = await withAdmin(async (db) => {
      const { data: order, error } = await db
        .from("orders")
        .select("*")
        .eq("id", body.orderId)
        .eq("email", userEmail)
        .single();

      if (error || !order) {
        throw new Error("Order not found");
      }

      return {
        id: order.id,
        total: order.price_cents,
        status: order.status,
        createdAt: order.created_at,
        mailedAt: order.mailed_at,
        metadata: order.metadata,
      };
    });

    return data;
  },
});

/**
 * Cancel an order and reverse the quote.
 *
 * Called when user wants to refund after payment.
 * Stripe webhook also triggers this on charge.refunded.
 */
export const cancelOrderAndReverseQuote = createServerFn({
  method: "POST",
  async handler(ctx) {
    const userEmail = ctx.request?.headers.get("x-user-email");
    if (!userEmail) {
      throw new Error("Unauthorized");
    }

    const body = z.object({
      orderId: z.string(),
      reason: z.string().optional(),
    }).parse(ctx.data);

    const { handleRefund } = await import("./stripe.server");

    const data = await withAdmin(async (db) => {
      // Get order
      const { data: order, error: orderError } = await db
        .from("orders")
        .select("*")
        .eq("id", body.orderId)
        .eq("email", userEmail)
        .single();

      if (orderError || !order) {
        throw new Error("Order not found");
      }

      if (order.status !== "paid") {
        throw new Error("Only paid orders can be refunded");
      }

      // Find and reverse quote
      const metadata = order.metadata as any;
      if (!metadata?.stripe_payment_intent_id) {
        throw new Error("Payment intent not found");
      }

      await handleRefund({
        stripePaymentIntentId: metadata.stripe_payment_intent_id,
        reason: body.reason || "Customer requested refund",
      });

      // Update order status
      const { error: updateError } = await db
        .from("orders")
        .update({ status: "refunded" })
        .eq("id", body.orderId);

      if (updateError) {
        throw new Error(`Failed to update order: ${updateError.message}`);
      }

      return { orderId: body.orderId, status: "refunded" };
    });

    return data;
  },
});
