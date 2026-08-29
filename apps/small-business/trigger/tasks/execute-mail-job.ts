import { schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";

const payloadSchema = z.object({
  mailingIntentId: z.string().uuid().optional(),
  mailJobId: z.string().uuid(),
  businessId: z.string().uuid(),
  recipientId: z.string().uuid(),
  documentId: z.string().uuid(),
  mailClass: z.enum(["standard", "certified", "registered"]),
  idempotencyKey: z.string().min(8),
});

const acceptedStatuses = new Set(["accepted", "queued", "submitted", "mailed"]);

/**
 * Durable execution boundary for a MailMyPDF Business mailing.
 * Provider-specific fulfillment stays behind the canonical MailMyPDF API.
 */
export const executeMailJob = schemaTask({
  id: "execute-mail-job",
  schema: payloadSchema,
  retry: { maxAttempts: 5, factor: 2, minTimeoutInMs: 1000, maxTimeoutInMs: 30000, randomize: true },
  run: async (payload) => {
    const baseUrl = process.env.MAILMYPDF_API_URL;
    const apiKey = process.env.MAILMYPDF_API_KEY;
    if (!baseUrl || !apiKey) throw new Error("MAILMYPDF_API_URL and MAILMYPDF_API_KEY must be configured");

    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/v1/business/mail-jobs/${payload.mailJobId}/execute`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}`, "idempotency-key": payload.idempotencyKey },
      body: JSON.stringify({ businessId: payload.businessId, recipientId: payload.recipientId, documentId: payload.documentId, mailClass: payload.mailClass }),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`MailMyPDF execution failed (${response.status}): ${body.slice(0, 500)}`);
    }

    const result = await response.json() as { mailJobId?: string; status?: string; trackingNumber?: string; proofId?: string };
    if (result.mailJobId !== payload.mailJobId) throw new Error("MailMyPDF execution response belongs to a different mail job");
    if (!result.status || !acceptedStatuses.has(result.status.toLowerCase())) throw new Error(`MailMyPDF returned a non-accepted execution status: ${result.status || "missing"}`);

    // The canonical API owns fulfillment/tracking/proof. The Trigger result is
    // the durable handoff record; webhook reconciliation can add later events.
    return result;
  },
});
