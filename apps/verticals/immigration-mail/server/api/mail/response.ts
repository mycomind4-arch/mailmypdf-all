/**
 * POST /api/mail/response
 *
 * Authenticated browser-return fallback for Immigration Mail.
 * Stripe payment/session authorization remains here; fulfillment correctness
 * is delegated to the canonical payment-fulfillment engine.
 */
import { createError, defineEventHandler, getRequestHeaders, getRequestURL, readBody, type H3Event } from "h3";
import { requireAuthenticatedUser } from "../../../src/lib/auth-guard";
import { fulfillFromBrowserReturn } from "@mailmypdf/payment-fulfillment";
import { createSupabaseIntentStore, createMailMyPDFClient } from "../../../src/platform/fulfillment-adapter";

function authRequest(event: H3Event): Request {
  return new Request(getRequestURL(event).toString(), {
    headers: getRequestHeaders(event) as HeadersInit,
  });
}

export default defineEventHandler(async (event) => {
  if (event.method !== "POST") throw createError({ statusCode: 405, statusMessage: "Method not allowed." });

  const user = await requireAuthenticatedUser(authRequest(event));
  const input = await readBody<{ stripeSessionId?: string }>(event);
  const sessionId = input?.stripeSessionId?.trim();
  if (!sessionId) throw createError({ statusCode: 400, statusMessage: "Stripe Checkout Session ID is required." });

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw createError({ statusCode: 503, statusMessage: "Stripe is not configured." });

  const { default: Stripe } = await import("stripe");
  const stripe = new Stripe(secretKey, { apiVersion: "2024-06-20" as Stripe.LatestApiVersion });
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    throw createError({ statusCode: 400, statusMessage: "Invalid Stripe Checkout Session." });
  }

  if (session.payment_status !== "paid") {
    throw createError({ statusCode: 409, statusMessage: "Payment has not been completed." });
  }

  const intentId = session.metadata?.mailing_intent_id;
  const ownerId = session.metadata?.owner_user_id;
  if (!intentId || ownerId !== user.id) {
    throw createError({ statusCode: 403, statusMessage: "Payment session does not belong to this account." });
  }

  const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
  const result = await fulfillFromBrowserReturn(
    createSupabaseIntentStore(),
    createMailMyPDFClient(),
    intentId,
    session.id,
    paymentIntentId,
    "immigration-mail",
  );

  if (!result.success) {
    const status = result.error?.includes("Integrity check") ? 403 : 502;
    throw createError({ statusCode: status, statusMessage: result.error || "Fulfillment failed." });
  }

  return {
    success: true,
    providerOrderId: result.providerOrderId,
    trackingNumber: result.trackingNumber ?? null,
    status: result.status ?? "submitted",
    idempotent: result.idempotent ?? false,
  };
});
