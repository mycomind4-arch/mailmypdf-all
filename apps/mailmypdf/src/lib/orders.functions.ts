/**
 * Orders Server Functions — thin wrappers over MailService.
 *
 * These server functions (createServerFn) are the TanStack Start
 * RPC layer. They validate input with zod, then delegate to the
 * MailService application service for all business logic.
 *
 * Routes import these functions — their signatures are stable.
 * The implementation has been moved to src/services/ for separation
 * of concerns (Phase 1 modernization).
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getMailService } from "@/services";
import type { OrderStatus } from "@/lib/order-state-machine";

// ── Shared Schemas ─────────────────────────────────────────────────────────────

const addressSchema = z.object({
  name: z.string().min(1).max(120),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional().nullable(),
  city: z.string().min(1).max(100),
  state: z.string().length(2),
  postalCode: z.string().regex(/^\d{5}(-\d{4})?$/),
});

const mailClassSchema = z.enum(["standard", "certified", "registered"]).default("standard");

// ── PDF Upload: Preview Pricing ──────────────────────────────────────────────

const previewInput = z.object({
  sizeBytes: z.number().int().positive().max(10 * 1024 * 1024),
  dataBase64: z.string().min(1),
});

export const previewPdfPricing = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => previewInput.parse(data))
  .handler(async ({ data }): Promise<{ pageCount: number; priceCents: number } | { error: string }> => {
    return getMailService().previewPdfPricing(data.sizeBytes, data.dataBase64);
  });

// ── Letter Editor: Preview Pricing ───────────────────────────────────────────

const previewLetterInput = z.object({
  letterText: z.string().min(1).max(20_000),
  color: z.boolean().optional().default(false),
  mailClass: z.enum(["standard", "certified", "registered"]).optional().default("standard"),
});

export const previewLetterPricing = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => previewLetterInput.parse(data))
  .handler(async ({ data }): Promise<{ pageCount: number; priceCents: number } | { error: string }> => {
    return getMailService().previewLetterPricing(data.letterText, data.color, data.mailClass);
  });

// ── Checkout: Create Stripe Session ─────────────────────────────────────────

const checkoutInput = z.object({
  orderId: z.string().uuid(),
  token: z.string().min(8).max(128),
});

type CheckoutResult = { clientSecret: string } | { error: string };

export const createCheckoutForOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => checkoutInput.parse(data))
  .handler(async ({ data }): Promise<CheckoutResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createStripeClient, getMailMyPdfBaseUrl, getStripeErrorMessage } = await import("@/lib/stripe.server");
    const { calculateTotalPrice, priceDescription } = await import("@/lib/pricing");

    // Fetch the order
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("id, lookup_token, status, email, page_count, price_cents, file_name, stripe_session_id, color, mail_class")
      .eq("id", data.orderId)
      .eq("lookup_token", data.token)
      .maybeSingle();
    if (error) return { error: error.message };
    if (!order) return { error: "Order not found." };

    const { canTransition } = await import("@/lib/order-state-machine");
    if (!canTransition(order.status as OrderStatus, "checkout_created")) return { error: "This order has already been paid or is no longer available." };

    try {
      const stripe = createStripeClient();

      if (order.stripe_session_id) {
        const existingSession = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
        if (existingSession.client_secret) {
          return { clientSecret: existingSession.client_secret };
        }
      }

      const mailClass = (order.mail_class || "standard") as "standard" | "certified" | "registered";

      const { getSubscriptionStatus, applyProPricing } = await import("@/lib/subscriptions");
      const subStatus = await getSubscriptionStatus(stripe, supabaseAdmin, order.email);

      const normalTotalCents = calculateTotalPrice({
        pageCount: order.page_count,
        color: order.color ?? false,
        mailClass,
      });

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

      const returnUrl = new URL(`/orders/${order.id}`, `${getMailMyPdfBaseUrl()}/`);
      returnUrl.searchParams.set("token", order.lookup_token);
      returnUrl.searchParams.set("paid", "1");

      const sessionParams = {
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: { name: description },
            unit_amount: totalCents,
          },
          quantity: 1,
        }],
        mode: "payment" as const,
        ui_mode: "embedded_page" as const,
        return_url: returnUrl.toString(),
        customer_email: order.email,
        payment_intent_data: { description: `${description} · ${order.file_name}` },
        metadata: { orderId: order.id },
      };
      const session = await stripe.checkout.sessions.create(sessionParams as any, {
        idempotencyKey: `checkout_${order.id}`,
      });

      const { data: claimed, error: claimError } = await supabaseAdmin
        .from("orders")
        .update({ stripe_session_id: session.id })
        .eq("id", order.id)
        .eq("status", "draft")
        .is("stripe_session_id", null)
        .select("id");

      if (claimError || !claimed || claimed.length !== 1) {
        const { logger } = await import("@/lib/logger");
        try {
          await stripe.checkout.sessions.expire(session.id);
        } catch (expirationError) {
          logger.error("Could not expire checkout session after draft ownership was lost", {
            orderId: order.id,
            sessionId: session.id,
            expirationError,
          });
        }
        return { error: "This draft expired before checkout could begin. Please upload the PDF again." };
      }

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

// ── Create Order from PDF Upload ─────────────────────────────────────────────

const createOrderInput = z.object({
  email: z.string().email().max(200),
  sender: addressSchema,
  recipient: addressSchema,
  file: z.object({
    name: z.string().min(1).max(200),
    sizeBytes: z.number().int().positive().max(10 * 1024 * 1024),
    dataBase64: z.string().min(1),
  }),
  color: z.boolean().default(false),
  mailClass: mailClassSchema,
  scheduledDeliveryDate: z.string().datetime().optional(),
});

export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => createOrderInput.parse(data))
  .handler(async ({ data, context }) => {
    return getMailService().createOrderFromPdf({
      email: data.email,
      sender: data.sender,
      recipient: data.recipient,
      file: data.file,
      color: data.color,
      mailClass: data.mailClass,
      scheduledDeliveryDate: data.scheduledDeliveryDate,
      clientIp: context.clientIp,
    });
  });

// ── Create Order from Letter Editor (typed in browser) ──────────────────────

const createLetterOrderInput = z.object({
  email: z.string().email().max(200),
  sender: addressSchema,
  recipient: addressSchema,
  letterText: z.string().min(1).max(20_000),
  templateId: z.string().optional(),
  color: z.boolean().default(false),
  mailClass: mailClassSchema,
  scheduledDeliveryDate: z.string().datetime().optional(),
});

export const createLetterOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => createLetterOrderInput.parse(data))
  .handler(async ({ data, context }) => {
    return getMailService().createOrderFromLetter({
      email: data.email,
      sender: data.sender,
      recipient: data.recipient,
      letterText: data.letterText,
      templateId: data.templateId,
      color: data.color,
      mailClass: data.mailClass,
      scheduledDeliveryDate: data.scheduledDeliveryDate,
      clientIp: context.clientIp,
    });
  });

// ── Get Order by Token ───────────────────────────────────────────────────────

const getOrderInput = z.object({
  id: z.string().uuid(),
  token: z.string().min(8).max(128),
});

export const getOrderByToken = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => getOrderInput.parse(data))
  .handler(async ({ data }) => {
    return getMailService().getOrder(data.id, data.token);
  });

// ── Lookup Order by Email + Order ID ─────────────────────────────────────────

const lookupInput = z.object({
  email: z.string().email().max(200),
  orderId: z.string().uuid(),
});

export const lookupOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => lookupInput.parse(data))
  .handler(async ({ data }): Promise<{ token: string } | { error: string }> => {
    const result = await getMailService().lookupOrder(data.email, data.orderId);
    if (!result) return { error: "We couldn't find an order matching that email and order ID." };
    return { token: result.token };
  });

// ── Backward compatibility re-exports ─────────────────────────────────────────

export function priceIdForPageCount(pages: number): "letter_short" | "letter_medium" | "letter_long" {
  if (pages <= 2) return "letter_short";
  if (pages <= 5) return "letter_medium";
  return "letter_long";
}
