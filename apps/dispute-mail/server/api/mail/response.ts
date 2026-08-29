import { createError, defineEventHandler, getRequestHeaders, getRequestURL, readBody, type H3Event } from "h3";
import { createClient } from "@supabase/supabase-js";
import { requireAuthenticatedUser } from "../../../src/lib/auth-guard";
import { uploadDocument, createCommunication, type MailType } from "../../../src/platform/mailmypdf";

const ALLOWED = new Set<MailType>(["first_class", "certified", "certified_return_receipt", "registered"]);
function authRequest(event: H3Event): Request { return new Request(getRequestURL(event).toString(), { headers: getRequestHeaders(event) as HeadersInit }); }
function serviceSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) throw createError({ statusCode: 503, statusMessage: "Supabase server configuration is incomplete." });
  return createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
}

export default defineEventHandler(async (event) => {
  if (event.method !== "POST") throw createError({ statusCode: 405, statusMessage: "Method not allowed." });
  const user = await requireAuthenticatedUser(authRequest(event));
  const { stripeSessionId } = await readBody<{ stripeSessionId?: string }>(event);
  if (!stripeSessionId?.trim()) throw createError({ statusCode: 400, statusMessage: "Stripe Checkout Session ID is required." });
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) throw createError({ statusCode: 503, statusMessage: "Stripe is not configured." });
  const supabase = serviceSupabase();
  const { default: Stripe } = await import("stripe");
  const stripe = new Stripe(secret, { apiVersion: "2024-06-20" as Stripe.LatestApiVersion });
  let session;
  try { session = await stripe.checkout.sessions.retrieve(stripeSessionId); } catch { throw createError({ statusCode: 400, statusMessage: "Invalid Stripe Checkout Session." }); }
  if (session.payment_status !== "paid") throw createError({ statusCode: 409, statusMessage: "Payment has not been completed." });
  const intentId = session.metadata?.mailing_intent_id;
  if (!intentId || session.metadata?.owner_user_id !== user.id) throw createError({ statusCode: 403, statusMessage: "Payment session does not belong to this account." });

  const { data: intent, error: intentError } = await supabase.from("mailing_intents").select("*").eq("id", intentId).eq("owner_id", user.id).single();
  if (intentError || !intent) throw createError({ statusCode: 404, statusMessage: "Mailing intent not found." });
  if (intent.stripe_session_id && intent.stripe_session_id !== stripeSessionId) throw createError({ statusCode: 409, statusMessage: "Stripe session does not match the stored intent." });
  if (intent.provider_order_id) return { success: true, providerOrderId: intent.provider_order_id, trackingNumber: intent.tracking_number ?? null, status: intent.status, idempotent: true };
  if (!ALLOWED.has(intent.mailing_method as MailType)) throw createError({ statusCode: 409, statusMessage: "Stored mailing method is invalid." });

  const recipient = intent.recipient as { name?: string; org?: string; address1?: string; address2?: string; city?: string; state?: string; zip?: string };
  if (!recipient?.name || !recipient.address1 || !recipient.city || !recipient.state || !recipient.zip) throw createError({ statusCode: 409, statusMessage: "Stored recipient is incomplete." });

  await supabase.from("mailing_intents").update({ status: "paid", stripe_session_id: stripeSessionId, stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null }).eq("id", intent.id).eq("owner_id", user.id).is("provider_order_id", null);
  try {
    const file = new File([intent.draft_content], `dispute-response-${intent.workflow_id}-${intent.id}.txt`, { type: "text/plain" });
    const document = await uploadDocument(file);
    const communication = await createCommunication({
      document_id: document.id,
      recipient: { name: recipient.name, address_line1: recipient.address1, address_line2: recipient.address2 || null, city: recipient.city, state: recipient.state.toUpperCase(), postal_code: recipient.zip, country: "US" },
      mail_type: intent.mailing_method as MailType,
      matter_reference: intent.matter_reference || intent.workflow_id,
      matter_type: intent.matter_type || "dispute-mail",
      metadata: { workflow_id: intent.workflow_id, case_id: intent.case_id, source: "dispute-mail", stripe_session_id: stripeSessionId, owner_user_id: user.id },
      idempotency_key: `stripe:${stripeSessionId}`,
    });
    await supabase.from("mailing_intents").update({ status: "submitted", provider_order_id: communication.id, tracking_number: communication.tracking_number ?? null, error_message: null }).eq("id", intent.id).eq("owner_id", user.id);
    if (intent.case_id) await supabase.from("dispute_cases").update({ status: "submitted", provider_order_id: communication.id, tracking_number: communication.tracking_number ?? null, submitted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", intent.case_id).eq("owner_id", user.id);
    return { success: true, providerOrderId: communication.id, trackingNumber: communication.tracking_number ?? null, status: communication.status ?? "submitted", idempotent: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Mailing submission failed.";
    await supabase.from("mailing_intents").update({ status: "failed", error_message: message }).eq("id", intent.id).eq("owner_id", user.id);
    if (intent.case_id) await supabase.from("dispute_cases").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", intent.case_id).eq("owner_id", user.id);
    throw createError({ statusCode: 502, statusMessage: `MailMyPDF mailing submission failed: ${message}` });
  }
});
