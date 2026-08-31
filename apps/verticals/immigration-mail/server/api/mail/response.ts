/**
 * POST /api/mail/response
 *
 * Payment-protected, authenticated Immigration Mail mailing endpoint.
 *
 * This is the browser-return path. It verifies payment and fulfills
 * the mailing intent. The Stripe webhook at /api/webhooks/stripe
 * handles the same flow server-to-server.
 *
 * Both paths are idempotent — the first to complete wins, the other
 * returns the existing provider_order_id.
 *
 * Verifies:
 *   1. Authenticated user.
 *   2. Stripe session is paid.
 *   3. Session belongs to the user.
 *   4. Mailing intent exists and hasn't been submitted.
 *   5. ★ approved_draft_hash matches stored draft_content.
 *   6. ★ approved_recipient_hash matches stored recipient.
 *
 * ★ = Gold Hardening Program integrity checks.
 */

import { createError, defineEventHandler, getRequestHeaders, getRequestURL, readBody, type H3Event } from "h3";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { requireAuthenticatedUser } from "../../../src/lib/auth-guard";
import { uploadDocument, createCommunication, type MailType } from "../../../src/platform/mailmypdf";

const ALLOWED = new Set<MailType>(["first_class", "certified", "certified_return_receipt", "registered"]);

function authRequest(event: H3Event): Request {
  return new Request(getRequestURL(event).toString(), { headers: getRequestHeaders(event) as HeadersInit });
}

function serviceSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) throw createError({ statusCode: 503, statusMessage: "Supabase server configuration is incomplete." });
  return createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
}

function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function hashRecipient(recipient: Record<string, string>): string {
  const canonical = JSON.stringify({
    name: recipient.name?.trim().toUpperCase() || "",
    org: recipient.org?.trim().toUpperCase() || "",
    address1: recipient.address1?.trim().toUpperCase() || "",
    address2: recipient.address2?.trim().toUpperCase() || "",
    city: recipient.city?.trim().toUpperCase() || "",
    state: recipient.state?.trim().toUpperCase() || "",
    zip: recipient.zip?.trim() || "",
  });
  return sha256(canonical);
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

  const { data: intent, error: intentError } = await supabase.from("mailing_intents").select("*").eq("id", intentId).eq("user_id", user.id).single();
  if (intentError || !intent) throw createError({ statusCode: 404, statusMessage: "Mailing intent not found." });
  if (intent.stripe_session_id && intent.stripe_session_id !== sessionId) throw createError({ statusCode: 409, statusMessage: "Stripe session does not match the stored intent." });

  // ── Idempotency: already fulfilled ──────────────────────────
  if (intent.provider_order_id) {
    return { success: true, providerOrderId: intent.provider_order_id, trackingNumber: intent.tracking_number ?? null, status: intent.status, idempotent: true };
  }
  if (!ALLOWED.has(intent.mailing_method as MailType)) throw createError({ statusCode: 409, statusMessage: "Stored mailing method is invalid." });

  // ── ★ APPROVAL HASH VERIFICATION ──────────────────────────
  if (intent.approved_draft_hash) {
    const computedDraftHash = sha256(intent.draft_content);
    if (computedDraftHash !== intent.approved_draft_hash) {
      throw createError({ statusCode: 403, statusMessage: "Integrity check failed: the stored draft does not match the approved draft." });
    }
  }

  const recipient = intent.recipient as { name?: string; org?: string; address1?: string; address2?: string; city?: string; state?: string; zip?: string };
  if (!recipient?.name || !recipient.address1 || !recipient.city || !recipient.state || !recipient.zip) throw createError({ statusCode: 409, statusMessage: "Stored recipient is incomplete." });

  // ── ★ RECIPIENT HASH VERIFICATION ─────────────────────────
  if (intent.approved_recipient_hash) {
    const computedRecipientHash = hashRecipient(recipient as Record<string, string>);
    if (computedRecipientHash !== intent.approved_recipient_hash) {
      throw createError({ statusCode: 403, statusMessage: "Integrity check failed: the stored recipient does not match the approved recipient." });
    }
  }

  await supabase.from("mailing_intents").update({ status: "paid", stripe_session_id: sessionId, stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null }).eq("id", intent.id).eq("user_id", user.id).is("provider_order_id", null);

  try {
    const file = new File([intent.draft_content], `immigration-response-${intent.workflow_id}-${intent.id}.txt`, { type: "text/plain" });
    const document = await uploadDocument(file);
    const communication = await createCommunication({
      document_id: document.id,
      recipient: {
        name: recipient.name,
        address_line1: recipient.address1,
        address_line2: recipient.address2 || null,
        city: recipient.city,
        state: recipient.state.toUpperCase(),
        postal_code: recipient.zip,
        country: "US",
      },
      mail_type: intent.mailing_method as MailType,
      matter_reference: intent.matter_reference || intent.workflow_id,
      matter_type: intent.matter_type || "immigration-mail",
      legal_reference: intent.legal_reference || { type: "other", citation: "Immigration Mail workflow", description: "Customer correspondence prepared through Immigration Mail." },
      metadata: { workflow_id: intent.workflow_id, source: "immigration-mail", stripe_session_id: sessionId, owner_user_id: user.id, approval_id: intent.approval_id || null, approved_draft_hash: intent.approved_draft_hash || null, fulfillment_source: "browser-return" },
      idempotency_key: `stripe:${sessionId}`,
    });

    await supabase.from("mailing_intents").update({ status: "submitted", provider_order_id: communication.id, tracking_number: communication.tracking_number ?? null, error_message: null }).eq("id", intent.id).eq("user_id", user.id);
    return { success: true, providerOrderId: communication.id, trackingNumber: communication.tracking_number ?? null, status: communication.status ?? "submitted", idempotent: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Mailing submission failed.";
    await supabase.from("mailing_intents").update({ status: "failed", error_message: message }).eq("id", intent.id).eq("user_id", user.id);
    throw createError({ statusCode: 502, statusMessage: `MailMyPDF mailing submission failed: ${message}` });
  }
});
