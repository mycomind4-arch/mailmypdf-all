import { z } from "zod";

export type MailExecutionInput = {
  mailJobId: string;
  businessId: string;
  recipientId: string;
  documentId: string;
  mailClass: "standard" | "certified" | "registered";
  idempotencyKey: string;
};

export type MailExecutionResult = {
  mailJobId: string;
  status: string;
  trackingNumber?: string;
  proofId?: string;
};

const mailExecutionResultSchema = z.object({
  mailJobId: z.string().min(1),
  status: z.string().min(1),
  trackingNumber: z.string().min(1).optional(),
  proofId: z.string().min(1).optional(),
});

export class MailMyPDFClient {
  constructor(private readonly baseUrl: string, private readonly apiKey: string) {}

  async executeMailJob(input: MailExecutionInput): Promise<MailExecutionResult> {
    const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/v1/business/mail-jobs/${input.mailJobId}/execute`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
        "idempotency-key": input.idempotencyKey,
      },
      body: JSON.stringify({
        businessId: input.businessId,
        recipientId: input.recipientId,
        documentId: input.documentId,
        mailClass: input.mailClass,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`MailMyPDF returned ${response.status}: ${body.slice(0, 500)}`);
    }

    const parsed = mailExecutionResultSchema.safeParse(await response.json().catch(() => null));
    if (!parsed.success) {
      throw new Error("MailMyPDF returned an invalid execution payload");
    }

    if (parsed.data.mailJobId !== input.mailJobId) {
      throw new Error("MailMyPDF execution response belongs to a different mail job");
    }

    return parsed.data;
  }
}
