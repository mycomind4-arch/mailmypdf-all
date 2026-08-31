import { requireAuthenticatedUser, json } from "../_auth";

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

    const response = await supabaseRest(env, `mailing_intents?id=eq.${encodeURIComponent(mailingIntentId)}&requested_by=eq.${encodeURIComponent(user.id)}&select=id,status,mail_job_id,business_id,stripe_session_id,trigger_response`);
    if (!response.ok) return json({ error: "Unable to load mailing intent." }, 502);
    const rows = await response.json() as Array<Record<string, unknown>>;
    const intent = rows[0];
    if (!intent) return json({ error: "Mailing intent not found." }, 404);
    if (intent.status === "queued" || intent.status === "processing" || intent.status === "mailed" || intent.status === "delivered") return json({ success: true, status: intent.status, mailingIntentId, idempotent: true });
    if (intent.status !== "paid") return json({ error: "Mailing intent is not paid." }, 409);
    if (typeof intent.mail_job_id !== "string" || !intent.mail_job_id) return json({ error: "Paid intent has no executable mail job." }, 409);

    const jobResponse = await supabaseRest(env, `mail_jobs?id=eq.${encodeURIComponent(intent.mail_job_id)}&business_id=eq.${encodeURIComponent(String(intent.business_id))}&select=id,business_id,recipient_id,document_id,mail_class,status`);
    if (!jobResponse.ok) return json({ error: "Unable to load executable mail job." }, 502);
    const jobs = await jobResponse.json() as Array<Record<string, unknown>>;
    const job = jobs[0];
    if (!job) return json({ error: "Executable mail job not found." }, 409);
    if (typeof job.recipient_id !== "string" || typeof job.document_id !== "string") return json({ error: "Mail job is missing recipient or document." }, 409);

    const triggerResponse = await fetch(`${(env.TRIGGER_API_URL || "https://api.trigger.dev").replace(/\/$/, "")}/api/v1/tasks/execute-mail-job/trigger`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${env.TRIGGER_SECRET_KEY}` },
      body: JSON.stringify({
        payload: {
          mailingIntentId: intent.id,
          mailJobId: job.id,
          businessId: job.business_id,
          recipientId: job.recipient_id,
          documentId: job.document_id,
          mailClass: job.mail_class,
          idempotencyKey: `mailing-intent:${intent.id}`,
        },
        options: { idempotencyKey: `mailing-intent:${intent.id}` },
      }),
    });
    const body = await triggerResponse.text();
    if (!triggerResponse.ok) return json({ error: "Paid execution could not be queued." }, 502);

    const update = await supabaseRest(env, `mailing_intents?id=eq.${encodeURIComponent(mailingIntentId)}&requested_by=eq.${encodeURIComponent(user.id)}`, { method: "PATCH", body: JSON.stringify({ status: "queued", trigger_response: body, error_message: null }) });
    if (!update.ok) return json({ error: "Execution queued but intent status could not be updated." }, 502);
    return json({ success: true, status: "queued", mailingIntentId, mailJobId: job.id, idempotent: false });
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: error instanceof Error ? error.message : "Unable to queue paid execution." }, 502);
  }
};
