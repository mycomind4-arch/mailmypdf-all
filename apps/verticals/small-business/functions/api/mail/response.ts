import { requireAuthenticatedUser, json } from "../../_auth";

type Env = { SUPABASE_URL?: string; SUPABASE_SERVICE_ROLE_KEY?: string; SUPABASE_ANON_KEY?: string; STRIPE_SECRET_KEY?: string; TRIGGER_API_URL?: string; TRIGGER_SECRET_KEY?: string };

async function supabaseRest(env: Env, path: string, init: RequestInit = {}) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase server configuration is incomplete.");
  return fetch(`${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${path}`, { ...init, headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "content-type": "application/json", ...(init.headers || {}) } });
}

async function queuePaidIntent(env: Env, intent: Record<string, unknown>) {
  if (!env.TRIGGER_SECRET_KEY) return { queued: false, reason: "Trigger execution is not configured." };
  const workflowId = String(intent.workflow_id || "").trim();
  if (!workflowId) return { queued: false, reason: "Mailing intent has no workflow." };
  const response = await fetch(`${(env.TRIGGER_API_URL || "https://api.trigger.dev").replace(/\/$/, "")}/api/v1/tasks/${encodeURIComponent(workflowId)}/trigger`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${env.TRIGGER_SECRET_KEY}` },
    body: JSON.stringify({ payload: { mailingIntentId: intent.id, businessId: intent.business_id, workflowId, mailJobId: intent.mail_job_id, stripeSessionId: intent.stripe_session_id }, options: { idempotencyKey: `mailing-intent:${intent.id}` } }),
  });
  const body = await response.text();
  if (!response.ok) return { queued: false, reason: "Trigger rejected the paid execution request." };
  const update = await supabaseRest(env, `mailing_intents?id=eq.${encodeURIComponent(String(intent.id))}&requested_by=eq.${encodeURIComponent(String(intent.requested_by))}`, { method: "PATCH", body: JSON.stringify({ status: "queued", trigger_response: body }) });
  if (!update.ok) return { queued: false, reason: "Trigger accepted the job but status could not be updated." };
  return { queued: true, reason: null };
}

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }): Promise<Response> => {
  try {
    const user = await requireAuthenticatedUser(request, env);
    const { stripeSessionId } = await request.json() as { stripeSessionId?: string };
    if (!stripeSessionId?.trim()) return json({ error: "Stripe Checkout Session ID is required." }, 400);
    if (!env.STRIPE_SECRET_KEY) return json({ error: "Stripe is not configured." }, 503);

    const stripeResponse = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(stripeSessionId)}`, { headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } });
    const session = await stripeResponse.json() as { id?: string; payment_status?: string; payment_intent?: string; metadata?: Record<string, string>; error?: { message?: string } };
    if (!stripeResponse.ok || !session.id) return json({ error: session.error?.message || "Invalid Stripe Checkout Session." }, 400);
    if (session.payment_status !== "paid") return json({ error: "Payment has not been completed." }, 409);

    const ownerId = session.metadata?.owner_user_id;
    const intentId = session.metadata?.mailing_intent_id;
    if (!ownerId || ownerId !== user.id || !intentId) return json({ error: "Payment session does not belong to this account." }, 403);

    const intentResponse = await supabaseRest(env, `mailing_intents?id=eq.${encodeURIComponent(intentId)}&requested_by=eq.${encodeURIComponent(user.id)}&select=*`);
    if (!intentResponse.ok) return json({ error: "Unable to load mailing intent." }, 502);
    const intents = await intentResponse.json() as Array<Record<string, unknown>>;
    const intent = intents[0];
    if (!intent) return json({ error: "Mailing intent not found." }, 404);

    if (intent.status === "queued" || intent.status === "processing" || intent.status === "mailed" || intent.status === "delivered") {
      return json({ success: true, status: intent.status, mailingIntentId: intentId, providerOrderId: intent.provider_order_id ?? null, trackingNumber: intent.tracking_number ?? null, idempotent: true });
    }
    if (intent.status !== "paid" && intent.provider_order_id) return json({ success: true, status: intent.status, mailingIntentId: intentId, idempotent: true });

    const updateResponse = await supabaseRest(env, `mailing_intents?id=eq.${encodeURIComponent(intentId)}&requested_by=eq.${encodeURIComponent(user.id)}&status=eq.pending`, { method: "PATCH", body: JSON.stringify({ status: "paid", stripe_session_id: stripeSessionId, stripe_payment_intent_id: session.payment_intent || null, error_message: null }) });
    if (!updateResponse.ok) return json({ error: "Unable to record verified payment." }, 502);

    const paidIntent = { ...intent, id: intentId, requested_by: user.id, status: "paid", stripe_session_id: stripeSessionId };
    const queued = await queuePaidIntent(env, paidIntent);
    if (!queued.queued) return json({ success: true, status: "paid", mailingIntentId: intentId, readyForTrigger: true, triggerQueued: false, warning: queued.reason, idempotent: false });
    return json({ success: true, status: "queued", mailingIntentId: intentId, triggerQueued: true, idempotent: false });
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: error instanceof Error ? error.message : "Unable to verify mailing payment." }, 502);
  }
};
