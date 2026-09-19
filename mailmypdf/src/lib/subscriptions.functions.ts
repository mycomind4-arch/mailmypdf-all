import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/rate-limit";

// ── Create Subscription Checkout ──────────────────────────────────────────────

const subCheckoutInput = z.object({
  email: z.string().email(),
});

type SubCheckoutResult = { url: string } | { error: string };

export const createSubscriptionCheckout = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => subCheckoutInput.parse(data))
  .handler(async ({ data }): Promise<SubCheckoutResult> => {
    const { createStripeClient, getMailMyPdfBaseUrl, getStripeErrorMessage } = await import("@/lib/stripe.server");
    const { getProPriceId, PRO_PLAN_NAME } = await import("@/lib/subscriptions");

    try {
      const stripe = createStripeClient();
      const priceId = getProPriceId();
      const baseUrl = getMailMyPdfBaseUrl();

      const returnUrl = new URL("/pro?success=1", `${baseUrl}/`);

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        customer_email: data.email,
        success_url: returnUrl.toString(),
        cancel_url: new URL("/pro?canceled=1", `${baseUrl}/`).toString(),
        metadata: { plan: "pro" },
        subscription_data: {
          metadata: { plan: "pro", email: data.email },
        },
      } as any, {
        idempotencyKey: `sub_checkout_${data.email}_${Date.now()}`,
      });

      if (!session.url) {
        return { error: "Failed to create checkout session." };
      }

      return { url: session.url };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

// ── Get Subscription Status ──────────────────────────────────────────────────

const subStatusInput = z.object({
  email: z.string().email(),
});

export const checkSubscriptionStatus = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => subStatusInput.parse(data))
  .handler(async ({ data }) => {
    const { createStripeClient } = await import("@/lib/stripe.server");
    const { getSubscriptionStatus, PRO_FREE_LETTERS_PER_MONTH, PRO_MEMBER_RATE_CENTS } = await import("@/lib/subscriptions");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const stripe = createStripeClient();
    const status = await getSubscriptionStatus(stripe, supabaseAdmin, data.email);

    return {
      isActive: status.isActive,
      plan: status.plan,
      currentPeriodEnd: status.currentPeriodEnd,
      lettersUsedThisPeriod: status.lettersUsedThisPeriod,
      lettersRemaining: status.lettersRemaining,
      freeLettersPerMonth: PRO_FREE_LETTERS_PER_MONTH,
      memberRateCents: PRO_MEMBER_RATE_CENTS,
    };
  });

// ── Cancel Subscription ───────────────────────────────────────────────────────

const cancelInput = z.object({
  email: z.string().email(),
});

export const cancelSubscription = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => cancelInput.parse(data))
  .handler(async ({ data }): Promise<{ success: boolean } | { error: string }> => {
    const { createStripeClient, getStripeErrorMessage } = await import("@/lib/stripe.server");
    const { getActiveSubscription } = await import("@/lib/subscriptions");

    try {
      const stripe = createStripeClient();
      const sub = await getActiveSubscription(stripe, data.email);

      if (!sub) return { error: "No active subscription found." };

      await stripe.subscriptions.cancel(sub.id);
      return { success: true };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
