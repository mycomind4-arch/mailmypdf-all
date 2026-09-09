import { requireAuthenticatedUser, json } from "../_auth";
import { queueMailJobExecution } from "../_fulfillment";

type Env = { SUPABASE_URL?: string; SUPABASE_SERVICE_ROLE_KEY?: string; SUPABASE_ANON_KEY?: string; TRIGGER_API_URL?: string; TRIGGER_SECRET_KEY?: string };

async function supabaseRest(env: Env, path: string, init: RequestInit = {}) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase server configuration is incomplete.");
  return fetch(`${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${path}`, { ...init, headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "content-type": "application/json", ...(init.headers || {}) } });
}

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }): Promise<Response> => {
  try {
    const user = await requireAuthenticatedUser(request, env);
    if (!env.TRIGGER_SECRET_KEY) return json({ error: "Trigger execution is not configured." }, 503);
    const { mailingIntentId } = await request.json() as { mailingIntentId?: string };
    if (!mailingIntentId?.trim()) return json({ error: "Mailing intent ID is required." }, 400);

    const response = await supabaseRest(env, `mailing_intents?id=eq.${encodeURIComponent(mailingIntentId)}&requested_by=eq.${encodeURIComponent(user.id)}&select=id,status,mail_job_id,business_id,workflow_id,stripe_session_id,trigger_response`);
    if (!response.ok) return json({ error: "Unable to load mailing intent." }, 502);
    const rows = await response.json() as Array<Record<string, unknown>>;
    const intent = rows[0];
    if (!intent) return json({ error: "Mailing intent not found." }, 404);
    if (intent.status === "queued" || intent.status === "processing" || intent.status === "mailed" || intent.status === "delivered") return json({ success: true, status: intent.status, mailingIntentId, idempotent: true });
    if (intent.status !== "paid") return json({ error: "Mailing intent is not paid." }, 409);

    // Route through the single fulfillment helper — see functions/_fulfillment.ts.
    const queued = await queueMailJobExecution(env, intent as { id: unknown; business_id: unknown; mail_job_id: unknown; workflow_id: unknown });
    if (!queued.queued) return json({ error: queued.reason || "Paid execution could not be queued." }, 409);
    return json({ success: true, status: "queued", mailingIntentId, mailJobId: intent.mail_job_id, idempotent: false });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[trigger-paid:smallbusiness] Error:", error);
    return json({ error: "Unable to queue paid execution." }, 502);
  }
};
