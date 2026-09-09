import { isAllowedWorkflowId } from "./_workflows";

export type FulfillmentEnv = {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  TRIGGER_API_URL?: string;
  TRIGGER_SECRET_KEY?: string;
};

export type QueueResult = { queued: boolean; reason: string | null };

async function supabaseRest(env: FulfillmentEnv, path: string, init: RequestInit = {}) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase server configuration is incomplete.");
  }
  return fetch(`${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "content-type": "application/json",
      ...(init.headers || {}),
    },
  });
}

/**
 * Queue durable fulfillment for a paid mailing intent.
 *
 * There is exactly ONE Trigger.dev task that can execute a mail job —
 * `execute-mail-job` (see trigger/tasks/execute-mail-job.ts), which expects
 * a payload of `{ mailJobId, businessId, recipientId, documentId, mailClass,
 * idempotencyKey }`. It is NOT keyed by `workflow_id` — there is no
 * per-workflow Trigger.dev task, so a task URL built from `workflow_id`
 * (e.g. `/tasks/payment-demand/trigger`) 404s against Trigger.dev and never
 * mails anything.
 *
 * This is the single place that queues fulfillment; every caller (the
 * Stripe webhook, the browser-return verification path, and the manual
 * retry endpoint) MUST go through it rather than building the Trigger.dev
 * call inline, to avoid re-introducing either the wrong-task-id bug or an
 * unvalidated `workflow_id` driving a privileged API call.
 */
export async function queueMailJobExecution(
  env: FulfillmentEnv,
  intent: { id: unknown; business_id: unknown; mail_job_id: unknown; workflow_id: unknown },
): Promise<QueueResult> {
  if (!env.TRIGGER_SECRET_KEY) return { queued: false, reason: "Fulfillment is not configured." };

  const workflowId = String(intent.workflow_id || "").trim();
  if (!isAllowedWorkflowId(workflowId)) return { queued: false, reason: "Unknown workflow — fulfillment blocked." };

  const intentId = String(intent.id || "");
  const businessId = String(intent.business_id || "");
  const mailJobId = intent.mail_job_id;
  if (!intentId || !businessId) return { queued: false, reason: "Mailing intent is missing required fields." };
  if (typeof mailJobId !== "string" || !mailJobId) return { queued: false, reason: "Paid intent has no executable mail job." };

  const jobResponse = await supabaseRest(
    env,
    `mail_jobs?id=eq.${encodeURIComponent(mailJobId)}&business_id=eq.${encodeURIComponent(businessId)}&select=id,business_id,recipient_id,document_id,mail_class,status`,
  );
  if (!jobResponse.ok) return { queued: false, reason: "Unable to load executable mail job." };
  const jobs = await jobResponse.json() as Array<Record<string, unknown>>;
  const job = jobs[0];
  if (!job) return { queued: false, reason: "Executable mail job not found." };
  if (typeof job.recipient_id !== "string" || typeof job.document_id !== "string") {
    return { queued: false, reason: "Mail job is missing recipient or document." };
  }

  const idempotencyKey = `mailing-intent:${intentId}`;
  const triggerResponse = await fetch(
    `${(env.TRIGGER_API_URL || "https://api.trigger.dev").replace(/\/$/, "")}/api/v1/tasks/execute-mail-job/trigger`,
    {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${env.TRIGGER_SECRET_KEY}` },
      body: JSON.stringify({
        payload: {
          mailingIntentId: intentId,
          mailJobId: job.id,
          businessId: job.business_id,
          recipientId: job.recipient_id,
          documentId: job.document_id,
          mailClass: job.mail_class,
          idempotencyKey,
        },
        options: { idempotencyKey },
      }),
    },
  );
  const body = await triggerResponse.text();
  if (!triggerResponse.ok) return { queued: false, reason: "Trigger.dev rejected the fulfillment request." };

  const update = await supabaseRest(env, `mailing_intents?id=eq.${encodeURIComponent(intentId)}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "queued", trigger_response: body, error_message: null }),
  });
  if (!update.ok) return { queued: false, reason: "Trigger accepted the job but status could not be updated." };
  return { queued: true, reason: null };
}
