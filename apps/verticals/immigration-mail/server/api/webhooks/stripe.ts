/**
 * POST /api/webhooks/stripe
 *
 * Immigration Mail Stripe webhook. Stripe signature verification remains
 * vertical/runtime-specific; payment -> fulfillment correctness is shared.
 */
import { createError, defineEventHandler, getRequestHeaders, readBody, type H3Event } from "h3";
import { handleStripeWebhookEvent } from "@mailmypdf/payment-fulfillment";
import { createSupabaseIntentStore, createMailMyPDFClient } from "../../../src/platform/fulfillment-adapter";

export default defineEventHandler(async (event: H3Event) => {
  if (event.method !== "POST") throw createError({ statusCode: 405, statusMessage: "Method not allowed." });

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) {
    throw createError({ statusCode: 503, statusMessage: "Stripe webhook is not configured." });
  }

  const rawBody = await readBody(event);
  const bodyText = typeof rawBody === "string" ? rawBody : JSON.stringify(rawBody);
  const headers = getRequestHeaders(event);
  const signature = headers["stripe-signature"] || headers["Stripe-Signature"];
  if (!signature) throw createError({ statusCode: 400, statusMessage: "Missing Stripe signature header." });

  const { default: Stripe } = await import("stripe");
  const stripe = new Stripe(secretKey, { apiVersion: "2024-06-20" as Stripe.LatestApiVersion });

  let stripeEvent: Stripe.Event;
  try {
    stripeEvent = await stripe.webhooks.constructEventAsync(bodyText, signature, webhookSecret);
  } catch (err) {
    throw createError({
      statusCode: 400,
      statusMessage: `Webhook signature verification failed: ${err instanceof Error ? err.message : "unknown error"}`,
    });
  }

  return handleStripeWebhookEvent(
    {
      type: stripeEvent.type,
      data: { object: stripeEvent.data.object as Record<string, unknown> },
    },
    {
      store: createSupabaseIntentStore(),
      client: createMailMyPDFClient(),
      verticalName: "immigration-mail",
      stripeSecretKey: secretKey,
      stripeWebhookSecret: webhookSecret,
    },
  );
});
