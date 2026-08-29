import { requireAuthenticatedUser, json } from "../_auth";
import {
  calculateQuote,
  getWorkflowPricingProfile,
  serializeQuote,
  PRICES,
  LABELS,
  isValidPricingKey,
  type MailClass,
} from "@mailmypdf/pricing";

type Env = { SUPABASE_URL?: string; SUPABASE_SERVICE_ROLE_KEY?: string; STRIPE_SECRET_KEY?: string; APP_URL?: string };

function estimatePageCount(draft: string): number {
  return Math.max(1, Math.ceil(draft.length / 3000));
}

async function db(env: Env, path: string, init: RequestInit = {}) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase server configuration is incomplete.");
  return fetch(`${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "content-type": "application/json", ...(init.headers || {}) },
  });
}

async function stripe(secret: string, params: Record<string, string>) {
  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", { method: "POST", headers: { authorization: `Bearer ${secret}`, "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(params) });
  const p = await response.json() as { id?: string; url?: string; error?: { message?: string } };
  if (!response.ok || !p.id) throw new Error(p.error?.message || "Stripe Checkout creation failed.");
  return { id: p.id, url: p.url ?? null };
}

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }): Promise<Response> => {
  try {
    const user = await requireAuthenticatedUser(request, env);
    if (!env.STRIPE_SECRET_KEY) return json({ error: "Stripe is not configured." }, 503);

    const input = await request.json() as {
      businessId?: string; workflowId?: string; title?: string;
      draftContent?: string; mailClass?: string;
      recipient?: Record<string, unknown>;
      mailJobId?: string; recipientId?: string; documentId?: string;
      scheduledFor?: string;
    };

    const method = input.mailClass;
    if (!input.businessId || !input.workflowId || !input.draftContent || input.draftContent.trim().length < 20) return json({ error: "Business, workflow, and completed document are required." }, 400);
    if (!method || !isValidPricingKey(method)) return json({ error: "A valid mail class is required." }, 400);
    if (!input.recipient || !String(input.recipient.name || "").trim()) return json({ error: "A recipient is required." }, 400);

    const membership = await db(env, `business_members?business_id=eq.${encodeURIComponent(input.businessId)}&user_id=eq.${encodeURIComponent(user.id)}&select=business_id`);
    if (!membership.ok || (await membership.json() as unknown[]).length === 0) return json({ error: "Business access denied." }, 403);

    // ── Canonical pricing — server-authoritative quote ─────────
    const profile = getWorkflowPricingProfile(input.workflowId);
    let quoteTotalCents: number;
    let quoteSnapshot: string | null = null;
    let lineItemName: string;
    let lineItemDescription: string;

    if (profile && profile.commercialStatus === "production") {
      const actualPages = estimatePageCount(input.draftContent);
      const mailClass = method as MailClass;
      const quote = calculateQuote({
        workflowId: input.workflowId,
        verticalId: profile.verticalId,
        actualPages,
        mailClass,
      });
      quoteTotalCents = quote.totalCents;
      quoteSnapshot = serializeQuote(quote);
      lineItemName = `${input.title || input.workflowId} — ${LABELS[method as keyof typeof LABELS]}`;
      lineItemDescription = `Workflow preparation ($${(quote.basePriceCents / 100).toFixed(2)}) + ${LABELS[method as keyof typeof LABELS]}`;
    } else {
      quoteTotalCents = PRICES[method as keyof typeof PRICES];
      lineItemName = LABELS[method as keyof typeof LABELS];
      lineItemDescription = `${input.title || input.workflowId} · ${LABELS[method as keyof typeof LABELS]}`;
    }

    const intent = await db(env, "mailing_intents", {
      method: "POST", headers: { prefer: "return=representation" },
      body: JSON.stringify({
        business_id: input.businessId, requested_by: user.id, workflow_id: input.workflowId,
        mail_job_id: input.mailJobId || null, recipient_id: input.recipientId || null, document_id: input.documentId || null,
        status: "pending", mailing_method: method, draft_content: input.draftContent, recipient: input.recipient,
        total_cents: quoteTotalCents, scheduled_for: input.scheduledFor || null, quote_snapshot: quoteSnapshot,
      }),
    });
    if (!intent.ok) return json({ error: "Unable to create mailing intent." }, 502);
    const rows = await intent.json() as Array<{ id: string }>;
    const intentId = rows[0]?.id;
    if (!intentId) return json({ error: "Unable to create mailing intent." }, 502);

    const appUrl = env.APP_URL || new URL(request.url).origin;
    const session = await stripe(env.STRIPE_SECRET_KEY, {
      mode: "payment", "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][unit_amount]": String(quoteTotalCents),
      "line_items[0][price_data][product_data][name]": lineItemName,
      "line_items[0][price_data][product_data][description]": lineItemDescription,
      "metadata[mailing_intent_id]": intentId, "metadata[owner_user_id]": user.id,
      "metadata[business_id]": input.businessId, "metadata[workflow_id]": input.workflowId,
      "metadata[quote_total_cents]": String(quoteTotalCents),
      "metadata[pricing_source]": profile ? "canonical" : "mailing-only",
      success_url: `${appUrl}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/?checkout=cancelled`,
    });

    await db(env, `mailing_intents?id=eq.${encodeURIComponent(intentId)}`, { method: "PATCH", body: JSON.stringify({ stripe_session_id: session.id }) });
    return json({ ok: true, checkoutUrl: session.url, sessionId: session.id, mailingIntentId: intentId });
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: error instanceof Error ? error.message : "Unable to start checkout." }, 502);
  }
};
