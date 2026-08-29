import { createHash, timingSafeEqual } from "node:crypto";

export type MailWebhookEvent = {
  id: string;
  type: "mailing.accepted" | "mailing.sent" | "mailing.in_transit" | "mailing.delivered" | "mailing.returned" | "proof.generated";
  mailJobId: string;
  occurredAt: string;
  data?: Record<string, unknown>;
};

export function verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = createHash("sha256").update(`${secret}.${rawBody}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function normalizeWebhook(payload: unknown): MailWebhookEvent {
  if (!payload || typeof payload !== "object") throw new Error("Invalid webhook payload");
  const value = payload as Record<string, unknown>;
  if (typeof value.id !== "string" || typeof value.type !== "string" || typeof value.mailJobId !== "string" || typeof value.occurredAt !== "string") {
    throw new Error("Webhook missing required fields");
  }
  const allowed = new Set(["mailing.accepted", "mailing.sent", "mailing.in_transit", "mailing.delivered", "mailing.returned", "proof.generated"]);
  if (!allowed.has(value.type)) throw new Error(`Unsupported webhook event: ${value.type}`);
  return value as unknown as MailWebhookEvent;
}
