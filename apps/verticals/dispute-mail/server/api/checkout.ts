/**
 * POST /api/checkout
 *
 * Creates an authenticated Stripe Checkout Session for a mailing intent.
 *
 * SECURITY: Requires a server-side approval reference. The draft and
 * recipient are loaded from the immutable approval record, NOT from
 * client-supplied values. This closes the approval-bypass gap.
 *
 * PRICING: Uses the canonical @mailmypdf/pricing engine to calculate
 * the full quote (workflow preparation fee + mailing service + extra pages).
 * The server resolves the workflow and calculates the amount — the client
 * never controls price.
 */

import { createError, defineEventHandler, getRequestHeaders, getRequestURL, readBody, type H3Event } from "h3";
import { createClient } from "@supabase/supabase-js";
import { requireAuthenticatedUser } from "../../src/lib/auth-guard";
import {
  calculateQuote,
  getWorkflowPricingProfile,
  serializeQuote,
  PRICES,
  LABELS,
  isValidPricingKey,
  type PricingKey,
  type MailClass,
} from "@mailmypdf/pricing";

function authRequest(event: H3Event): Request {
  return new Request(getRequestURL(event).toString(), { headers: getRequestHeaders(event) as HeadersInit });
}

function serviceSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) throw createError({ statusCode: 503, statusMessage: "Supabase server configuration is incomplete." });
  return createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
}

function estimatePageCount(draft: string): number {
  return Math.max(1, Math.ceil(draft.length / 3000));
}

export default defineEventHandler(async (event) => {
  if (event.method !== "POST") throw createError({ statusCode: 405, statusMessage: "Method not allowed." });
  const user = await requireAuthenticatedUser(authRequest(event));

  const input = await readBody<{
    approvalId?: string;
    workflowId?: string;
    workflowTitle?: string;
    caseId?: string;
    mailingMethod?: string;
    matterReference?: string;
    matterType?: string;
    // Legacy fields — ignored when approvalId is present
    draftContent?: string;
    recipient?: { name?: string; org?: string; address1?: string; address2?: string; city?: string; state?: string; zip?: string };
  }>(event);

  const approvalId = input?.approvalId?.trim();
  const workflowId = input?.workflowId?.trim();
  const methodRaw = input?.mailingMethod;

  if (!approvalId) {
    throw createError({ statusCode: 400, statusMessage: "Server-side approval is required before checkout. Call /api/approve first." });
  }
  if (!workflowId) throw createError({ statusCode: 400, statusMessage: "Workflow ID is required." });
  if (!methodRaw || !isValidPricingKey(methodRaw)) throw createError({ statusCode: 400, statusMessage: "Invalid mailing method." });

  const method = methodRaw as PricingKey;
  const mailClass: MailClass = method as MailClass;
  const supabase = serviceSupabase();

  // Load the immutable approval record
  const { data: approval, error: approvalError } = await supabase
    .from("approvals")
    .select("id, owner_id, case_id, workflow_id, draft, recipient, draft_hash, recipient_hash, status, approved_at")
    .eq("id", approvalId)
    .eq("owner_id", user.id)
    .eq("status", "active")
    .single();

  if (approvalError || !approval) {
    throw createError({ statusCode: 404, statusMessage: "Approval record not found, revoked, or not owned by the authenticated user." });
  }
  if (approval.workflow_id !== workflowId) {
    throw createError({ statusCode: 409, statusMessage: "Approval does not match the requested workflow." });
  }

  const draft = approval.draft as string;
  const recipient = approval.recipient as { name?: string; org?: string; address1?: string; address2?: string; city?: string; state?: string; zip?: string };

  if (!draft || draft.length < 20) throw createError({ statusCode: 409, statusMessage: "Approved draft is invalid." });
  if (!recipient?.name || !recipient.address1 || !recipient.city || !recipient.state || !recipient.zip) {
    throw createError({ statusCode: 409, statusMessage: "Approved recipient is incomplete." });
  }
  if (!/^[A-Za-z]{2}$/.test(recipient.state)) throw createError({ statusCode: 409, statusMessage: "Approved recipient state is invalid." });
  if (!/^\d{5}(-\d{4})?$/.test(recipient.zip)) throw createError({ statusCode: 409, statusMessage: "Approved recipient ZIP code is invalid." });

  // ── Canonical pricing — server-authoritative quote ─────────
  const profile = getWorkflowPricingProfile(workflowId);
  let quoteTotalCents: number;
  let quoteSnapshot: string | null = null;
  let stripeLineItemName: string;
  let stripeLineItemDescription: string;

  if (profile && profile.commercialStatus === "production") {
    const actualPages = estimatePageCount(draft);
    const quote = calculateQuote({
      workflowId,
      verticalId: profile.verticalId,
      actualPages,
      mailClass,
    });
    quoteTotalCents = quote.totalCents;
    quoteSnapshot = serializeQuote(quote);

    const workflowTitle = input?.workflowTitle?.trim() || workflowId;
    stripeLineItemName = `${workflowTitle} — ${LABELS[method]}`;
    stripeLineItemDescription = `Workflow preparation (${profile.band}: $${(quote.basePriceCents / 100).toFixed(2)}) + ${LABELS[method]}${quote.extraPageCost > 0 ? ` + ${Math.max(0, actualPages - profile.includedPages)} extra pages` : ""}`;
  } else {
    quoteTotalCents = PRICES[method];
    stripeLineItemName = LABELS[method];
    stripeLineItemDescription = `${input?.workflowTitle?.trim() || workflowId} · ${LABELS[method]}`;
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) throw createError({ statusCode: 503, statusMessage: "Stripe is not configured." });
  const { default: Stripe } = await import("stripe");
  const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" as Stripe.LatestApiVersion });
  const appUrl = process.env.APP_URL || getRequestURL(event).origin;

  if (input?.caseId) {
    const { data: ownedCase } = await supabase.from("dispute_cases").select("id").eq("id", input.caseId).eq("owner_id", user.id).maybeSingle();
    if (!ownedCase) throw createError({ statusCode: 404, statusMessage: "Dispute case not found." });
  }

  const { data: intent, error: intentError } = await supabase.from("mailing_intents").insert({
    owner_id: user.id, workflow_id: workflowId, case_id: input?.caseId || null, status: "pending", mailing_method: method,
    draft, recipient, matter_reference: input?.matterReference?.trim() || workflowId, matter_type: input?.matterType?.trim() || "dispute-mail",
    approval_id: approvalId, approved_draft_hash: approval.draft_hash, approved_recipient_hash: approval.recipient_hash, quote_snapshot: quoteSnapshot,
  }).select("id").single();

  if (intentError || !intent) throw createError({ statusCode: 502, statusMessage: `Unable to create mailing intent: ${intentError?.message || "unknown error"}` });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment", payment_method_types: ["card"],
      line_items: [{ price_data: { currency: "usd", product_data: { name: stripeLineItemName, description: stripeLineItemDescription }, unit_amount: quoteTotalCents }, quantity: 1 }],
      metadata: { mailing_intent_id: intent.id, owner_user_id: user.id, workflow_id: workflowId, approval_id: approvalId, quote_total_cents: String(quoteTotalCents), pricing_source: profile ? "canonical" : "mailing-only" },
      success_url: `${appUrl}/workflows/${workflowId}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/workflows/${workflowId}?checkout=cancelled`,
    });
    const { error: updateError } = await supabase.from("mailing_intents").update({ stripe_session_id: session.id }).eq("id", intent.id).eq("owner_id", user.id);
    if (updateError) throw updateError;
    return { ok: true, checkoutUrl: session.url, sessionId: session.id };
  } catch (error) {
    await supabase.from("mailing_intents").update({ status: "failed", error_message: error instanceof Error ? error.message : "Stripe checkout creation failed" }).eq("id", intent.id).eq("owner_id", user.id);
    throw createError({ statusCode: 502, statusMessage: error instanceof Error ? error.message : "Unable to create Stripe checkout." });
  }
});
