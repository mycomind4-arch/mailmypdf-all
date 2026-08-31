/**
 * POST /api/mail/response
 *
 * Payment-protected, authenticated Notice Respond mailing endpoint.
 * Browser-return path (fallback to Stripe webhook).
 * Uses @mailmypdf/payment-fulfillment's shared fulfillment engine.
 *
 * Verifies:
 *   1. Authenticated user.
 *   2. Stripe session is paid.
 *   3. Session belongs to the user.
 *   4. Mailing intent exists and belongs to the user.
 *   5. ★ approved_draft_hash matches stored draft.
 *   6. ★ approved_recipient_hash matches stored recipient.
 */

import { createError, defineEventHandler, getRequestHeaders, getRequestURL, readBody, type H3Event } from "h3";
import { createClient } from "@supabase/supabase-js";
import { requireAuthenticatedUser } from "../../../src/lib/auth-guard";
import {
  fulfillFromBrowserReturn,
  createSupabaseIntentStore,
  createMailMyPDFClient,
} from "../../../src/platform/fulfillment-adapter";

function authRequest(event: H3Event): Request {
  return new Request(getRequestURL(event).toString(), { headers: getRequestHeaders(event) as HeadersInit });
}

function serviceSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) throw createError({ statusCode: 503, statusMessage: "Supabase server configuration is incomplete." });
  return createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
}

export default defineEventHandler(async (event) => {
  if (event.method !== "POST") throw createError({ statusCode: 405, statusMessage: "Method not allowed." });
  const user = await requireAuthenticatedUser(authRequest(event));
  const input = await readBody<{ stripeSessionId?: string }>(event);
  const sessionId = input?.stripeSessionId?.trim();
  if (!sessionId) throw createError({ statusCode: 400, statusMessage: "Stripe Checkout Session ID is required." });

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw createError({ statusCode: 503, statusMessage: "Stripe is not configured." });
  const supabase = serviceSupabase();
  const { default: Stripe } = await import("stripe");
  const stripe = new Stripe(secretKey, { apiVersion: "2024-06-20" as Stripe.LatestApiVersion });

  let session;
  try { session = await stripe.checkout.sessions.retrieve(sessionId); }
  catch { throw createError({ statusCode: 400, statusMessage: "Invalid Stripe Checkout Session." }); }
  if (session.payment_status !== "paid") throw createError({ statusCode: 409, statusMessage: "Payment has not been completed." });

  const intentId = session.metadata?.mailing_intent_id;
  const ownerId = session.metadata?.owner_user_id;
  if (!intentId || ownerId !== user.id) throw createError({ statusCode: 403, statusMessage: "Payment session does not belong to this account." });

  // ── Ownership check ────────────────────────────────────────
  const { data: intent, error: intentError } = await supabase
    .from("mailing_intents")
    .select("*")
    .eq("id", intentId)
    .eq("owner_id", user.id)
    .single();
  if (intentError || !intent) throw createError({ statusCode: 404, statusMessage: "Mailing intent not found." });

  // ── Delegate to shared fulfillment engine ─────────────────
  const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : null;

  const result = await fulfillFromBrowserReturn(
    createSupabaseIntentStore(),
    createMailMyPDFClient(),
    intentId,
    sessionId,
    paymentIntentId,
    "notice-respond",
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
