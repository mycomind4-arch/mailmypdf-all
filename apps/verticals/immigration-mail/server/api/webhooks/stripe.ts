/**
 * POST /api/webhooks/stripe
 *
 * Stripe webhook handler for Immigration Mail.
 *
 * Listens for `checkout.session.completed` events and triggers
 * fulfillment independently of the browser return path.
 *
 * This closes P1 #8: fulfillment no longer depends on the user
 * returning to the success URL. Stripe's server-to-server webhook
 * drives the mailing even if the user closes their browser.
 *
 * Security:
 *   - Verifies Stripe signature using STRIPE_WEBHOOK_SECRET
 *   - Idempotent: skips already-fulfilled intents
 *   - Verifies approved artifact hashes before mailing
 */

import { createError, defineEventHandler, getRequestHeaders, readBody, type H3Event } from "h3";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { uploadDocument, createCommunication, type MailType } from "../../../src/platform/mailmypdf";

const ALLOWED = new Set<MailType>(["first_class", "certified", "certified_return_receipt", "registered"]);

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

async function fulfillMailingIntent(
  supabase: ReturnType<typeof serviceSupabase>,
  intentId: string,
  sessionId: string,
  paymentIntentId: string | null,
): Promise<{ success: boolean; providerOrderId?: string; trackingNumber?: string | null; status?: string; error?: string }> {
  const { data: intent, error: intentError } = await supabase
    .from("mailing_intents")
    .select("*")
    .eq("id", intentId)
    .single();

  if (intentError || !intent) {
    return { success: false, error: `Mailing intent not found: ${intentId}` };
  }

  if (intent.provider_order_id) {
    return {
      success: true,
      providerOrderId: intent.provider_order_id,
      trackingNumber: intent.tracking_number ?? null,
      status: intent.status,
    };
  }

  if (intent.status === "submitted" || intent.status === "tracking") {
    return { success: true, status: intent.status };
  }

  if (intent.stripe_session_id && intent.stripe_session_id !== sessionId) {
    return { success: false, error: "Stripe session does not match the stored intent." };
  }

  if (!ALLOWED.has(intent.mailing_method as MailType)) {
    return { success: false, error: "Stored mailing method is invalid." };
  }

  if (intent.approved_draft_hash) {
    const computedDraftHash = sha256(intent.draft_content);
    if (computedDraftHash !== intent.approved_draft_hash) {
      return { success: false, error: "Integrity check failed: the stored draft does not match the approved draft." };
    }
  }

  const recipient = intent.recipient as { name?: string; org?: string; address1?: string; address2?: string; city?: string; state?: string; zip?: string };
  if (!recipient?.name || !recipient.address1 || !recipient.city || !recipient.state || !recipient.zip) {
    return { success: false, error: "Stored recipient is incomplete." };
  }

  if (intent.approved_recipient_hash) {
    const computedRecipientHash = hashRecipient(recipient as Record<string, string>);
    if (computedRecipientHash !== intent.approved_recipient_hash) {
      return { success: false, error: "Integrity check failed: the stored recipient does not match the approved recipient." };
    }
  }

  await supabase
    .from("mailing_intents")
    .update({
      status: "paid",
      stripe_session_id: sessionId,
      stripe_payment_intent_id: paymentIntentId,
    })
    .eq("id", intentId)
    .is("provider_order_id", null);

  try {
    const file = new File(
      [intent.draft_content],
      `immigration-response-${intent.workflow_id}-${intent.id}.txt`,
      { type: "text/plain" }
    );
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
      legal_reference: intent.legal_reference || {
        type: "other",
        citation: "Immigration Mail workflow",
        description: "Customer correspondence prepared through Immigration Mail.",
      },
      metadata: {
        workflow_id: intent.workflow_id,
        source: "immigration-mail",
        stripe_session_id: sessionId,
        owner_user_id: intent.user_id,
        approval_id: intent.approval_id || null,
        approved_draft_hash: intent.approved_draft_hash || null,
        fulfillment_source: "stripe-webhook",
      },
      idempotency_key: `stripe:${sessionId}`,
    });

    await supabase
      .from("mailing_intents")
      .update({
        status: "submitted",
        provider_order_id: communication.id,
        tracking_number: communication.tracking_number ?? null,
        error_message: null,
      })
      .eq("id", intentId);

    return {
      success: true,
      providerOrderId: communication.id,
      trackingNumber: communication.tracking_number ?? null,
      status: communication.status ?? "submitted",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Mailing submission failed.";
    await supabase
      .from("mailing_intents")
      .update({ status: "failed", error_message: message })
      .eq("id", intentId);
    return { success: false, error: message };
  }
}

export default defineEventHandler(async (event: H3Event) => {
  if (event.method !== "POST") throw createError({ statusCode: 405, statusMessage: "Method not allowed." });

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secretKey || !webhookSecret) {
    throw createError({ statusCode: 503, statusMessage: "Stripe webhook is not configured. Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET." });
  }

  const rawBody = await readBody(event);
  const bodyText = typeof rawBody === "string" ? rawBody : JSON.stringify(rawBody);

  const headers = getRequestHeaders(event);
  const signature = headers["stripe-signature"] || headers["Stripe-Signature"];

  if (!signature) {
    throw createError({ statusCode: 400, statusMessage: "Missing Stripe signature header." });
  }

  const { default: Stripe } = await import("stripe");
  const stripe = new Stripe(secretKey, { apiVersion: "2024-06-20" as Stripe.LatestApiVersion });

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

  if (stripeEvent.type === "checkout.session.completed") {
    const session = stripeEvent.data.object as Stripe.Checkout.Session;

    if (session.payment_status !== "paid") {
      return { received: true, skipped: true, reason: `payment_status=${session.payment_status}` };
    }

    const intentId = session.metadata?.mailing_intent_id;
    if (!intentId) {
      return { received: true, skipped: true, reason: "no mailing_intent_id in metadata" };
    }

    const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : null;
    const supabase = serviceSupabase();

    const result = await fulfillMailingIntent(supabase, intentId, session.id, paymentIntentId);

    if (!result.success) {
      console.error(`[stripe-webhook] Fulfillment failed for intent ${intentId}: ${result.error}`);
      return { received: true, fulfilled: false, error: result.error, intentId };
    }

    return { received: true, fulfilled: true, intentId, providerOrderId: result.providerOrderId };
  }

  if (stripeEvent.type === "checkout.session.expired") {
    const session = stripeEvent.data.object as Stripe.Checkout.Session;
    const intentId = session.metadata?.mailing_intent_id;
    if (intentId) {
      const supabase = serviceSupabase();
      await supabase
        .from("mailing_intents")
        .update({ status: "expired", error_message: "Stripe checkout session expired." })
        .eq("id", intentId)
        .is("provider_order_id", null);
    }
    return { received: true, handled: "checkout.session.expired" };
  }

  if (stripeEvent.type === "charge.refunded") {
    const charge = stripeEvent.data.object as Stripe.Charge;
    const intentId = charge.metadata?.mailing_intent_id;
    if (intentId) {
      const supabase = serviceSupabase();
      await supabase
        .from("mailing_intents")
        .update({ status: "refunded", error_message: "Payment refunded by Stripe." })
        .eq("id", intentId);
    }
    return { received: true, handled: "charge.refunded" };
  }

  return { received: true, unhandled: stripeEvent.type };
});
