/**
 * POST /api/webhooks/stripe
 *
 * Stripe webhook handler for Dispute Mail.
 *
 * CRITICAL: This closes the security gap identified in the ecosystem audit.
 * Without this webhook, dispute-mail relied solely on the browser-return
 * path for payment verification and fulfillment. If the user closed their
 * browser after paying, the payment was collected but fulfillment never fired.
 *
 * This webhook:
 * - Verifies Stripe signature server-side
 * - Handles checkout.session.completed (payment success → fulfillment)
 * - Handles checkout.session.expired (mark intent expired)
 * - Handles charge.refunded (mark intent refunded)
 * - Is idempotent — duplicate events cannot create duplicate mailings
 * - Uses the shared @mailmypdf/payment-fulfillment engine
 *
 * Required environment variables:
 * - STRIPE_SECRET_KEY
 * - STRIPE_WEBHOOK_SECRET
 * - SUPABASE_URL / VITE_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

import { createError, defineEventHandler, getRequestHeaders, readBody, type H3Event } from "h3";
import {
  handleStripeWebhookEvent,
  createSupabaseIntentStore,
  createMailMyPDFClient,
} from "../../../src/platform/fulfillment-adapter";

export default defineEventHandler(async (event: H3Event) => {
  if (event.method !== "POST") {
    throw createError({ statusCode: 405, statusMessage: "Method not allowed." });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secretKey || !webhookSecret) {
    throw createError({
      statusCode: 503,
      statusMessage: "Stripe webhook is not configured.",
    });
  }

  // ── Read raw body ──────────────────────────────────────────
  const rawBody = await readBody(event);
  const bodyText = typeof rawBody === "string" ? rawBody : JSON.stringify(rawBody);

  // ── Get Stripe signature ───────────────────────────────────
  const headers = getRequestHeaders(event);
  const signature = headers["stripe-signature"] || headers["Stripe-Signature"];

  if (!signature) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing Stripe signature header.",
    });
  }

  // ── Verify webhook signature ───────────────────────────────
  const { default: Stripe } = await import("stripe");
  const stripe = new Stripe(secretKey, {
    apiVersion: "2024-06-20" as Stripe.LatestApiVersion,
  });

  let stripeEvent: Stripe.Event;
  try {
    stripeEvent = await stripe.webhooks.constructEventAsync(
      bodyText,
      signature,
      webhookSecret,
    );
  } catch (err) {
    throw createError({
      statusCode: 400,
      statusMessage: `Webhook signature verification failed: ${err instanceof Error ? err.message : "unknown error"}`,
    });
  }

  // ── Delegate to shared fulfillment engine ──────────────────
  return handleStripeWebhookEvent(
    {
      type: stripeEvent.type,
      data: { object: stripeEvent.data.object as Record<string, unknown> },
    },
    {
      store: createSupabaseIntentStore(),
      client: createMailMyPDFClient(),
      verticalName: "dispute-mail",
      stripeSecretKey: secretKey,
      stripeWebhookSecret: webhookSecret,
    },
  );
});
