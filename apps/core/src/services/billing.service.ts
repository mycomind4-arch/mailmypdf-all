/**
 * BillingService — handles payment processing and subscription checks.
 *
 * Extracted from orders.functions.ts to separate payment logic from
 * order creation and fulfillment.
 *
 * Uses the existing stripe.server.ts functions as the implementation.
 * Future: will use the PaymentProvider interface from providers/.
 */

import type { MailClass } from "@/lib/pricing";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CreateCheckoutParams {
  orderId: string;
  lookupToken: string;
  email: string;
  pageCount: number;
  color: boolean;
  mailClass: MailClass;
  fileName: string;
  /** Base URL for return URLs (e.g., https://mailmypdf.mailmypdf.workers.dev) */
  baseUrl: string;
}

export interface CheckoutResult {
  clientSecret: string;
  sessionId: string;
}

export interface CheckoutError {
  error: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

export class BillingService {
  /**
   * Create a Stripe embedded checkout session for an order.
   *
   * Handles:
   * - Existing session reuse (idempotency)
   * - Pro subscription discount application
   * - Draft ownership race condition (claim with conditional update)
   * - Session expiration on race loss
   */
  async createCheckoutSession(
    params: CreateCheckoutParams,
  ): Promise<CheckoutResult | CheckoutError> {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const {
      createStripeClient,
      getMailMyPdfBaseUrl,
      getStripeErrorMessage,
    } = await import("@/lib/stripe.server");
    const { calculateTotalPrice, priceDescription } = await import("@/lib/pricing");
    const { canTransition } = await import("@/lib/order-state-machine");
    const { logger } = await import("@/lib/logger");

    // Fetch the order
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select(
        "id, lookup_token, status, email, page_count, price_cents, file_name, stripe_session_id, color, mail_class",
      )
      .eq("id", params.orderId)
      .eq("lookup_token", params.lookupToken)
      .maybeSingle();

    if (error) return { error: error.message };
    if (!order) return { error: "Order not found." };
    if (!canTransition(order.status as OrderStatus, "checkout_created"))
      return { error: "This order has already been paid or is no longer available." };

    try {
      const stripe = createStripeClient();

      // Reuse existing session if one exists
      if (order.stripe_session_id) {
        const existingSession = await stripe.checkout.sessions.retrieve(
          order.stripe_session_id,
        );
        if (existingSession.client_secret) {
          return {
            clientSecret: existingSession.client_secret,
            sessionId: existingSession.id,
          };
        }
      }

      const mailClass = (order.mail_class || "standard") as MailClass;

      // Check for MailMyPDF Pro subscription
      const { getSubscriptionStatus, applyProPricing } = await import("@/lib/subscriptions");
      const subStatus = await getSubscriptionStatus(stripe, supabaseAdmin, order.email);

      const normalTotalCents = calculateTotalPrice({
        pageCount: order.page_count,
        color: order.color ?? false,
        mailClass,
      });

      // Extract base price (without add-ons) for Pro calculation
      const basePriceCents = calculateTotalPrice({
        pageCount: order.page_count,
        color: false,
        mailClass: "standard",
      });

      let totalCents = normalTotalCents;
      let description = priceDescription({
        pageCount: order.page_count,
        color: order.color ?? false,
        mailClass,
      });

      // Apply Pro benefits if user has active subscription
      if (subStatus.isActive) {
        const proResult = applyProPricing({
          pageCount: order.page_count,
          color: order.color ?? false,
          mailClass,
          subStatus,
          basePriceCents,
        });
        totalCents = proResult.totalCents;
        if (proResult.breakdown) {
          description = `${description} · ${proResult.breakdown}`;
        }
      }

      const returnUrl = new URL(
        `/orders/${order.id}`,
        `${getMailMyPdfBaseUrl()}/`,
      );
      returnUrl.searchParams.set("token", order.lookup_token);
      returnUrl.searchParams.set("paid", "1");

      const sessionParams = {
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: { name: description },
              unit_amount: totalCents,
            },
            quantity: 1,
          },
        ],
        mode: "payment" as const,
        ui_mode: "embedded_page" as const,
        return_url: returnUrl.toString(),
        customer_email: order.email,
        payment_intent_data: {
          description: `${description} · ${order.file_name}`,
        },
        metadata: { orderId: order.id },
      };

      const session = await stripe.checkout.sessions.create(sessionParams as any, {
        idempotencyKey: `checkout_${order.id}`,
      });

      // Claim the draft (conditional update to prevent races)
      const { data: claimed, error: claimError } = await supabaseAdmin
        .from("orders")
        .update({ stripe_session_id: session.id })
        .eq("id", order.id)
        .eq("status", "draft")
        .is("stripe_session_id", null)
        .select("id");

      if (claimError || !claimed || claimed.length !== 1) {
        // Lost the race — expire the session
        try {
          await stripe.checkout.sessions.expire(session.id);
        } catch (expirationError) {
          logger.error(
            "Could not expire checkout session after draft ownership was lost",
            { orderId: order.id, sessionId: session.id, expirationError },
          );
        }
        return {
          error:
            "This draft expired before checkout could begin. Please upload the PDF again.",
        };
      }

      return {
        clientSecret: session.client_secret ?? "",
        sessionId: session.id,
      };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  }

  /**
   * Check whether an email has an active Pro subscription.
   */
  async checkSubscription(email: string) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createStripeClient } = await import("@/lib/stripe.server");
    const { getSubscriptionStatus } = await import("@/lib/subscriptions");
    const stripe = createStripeClient();
    return getSubscriptionStatus(stripe, supabaseAdmin, email);
  }
}
