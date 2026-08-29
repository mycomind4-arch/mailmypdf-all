import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { normalizeWebhook, verifyWebhookSignature } from "./webhookProcessor";

describe("webhookProcessor", () => {
  const secret = "webhook-secret";
  const rawBody = JSON.stringify({
    id: "evt-1",
    type: "mailing.delivered",
    mailJobId: "job-1",
    occurredAt: "2026-08-20T10:00:00.000Z",
    data: { businessId: "business-1" },
  });

  it("accepts the exact signed payload", () => {
    const signature = createHash("sha256").update(`${secret}.${rawBody}`).digest("hex");
    expect(verifyWebhookSignature(rawBody, signature, secret)).toBe(true);
  });

  it("rejects invalid signatures", () => {
    expect(verifyWebhookSignature(rawBody, "bad-signature", secret)).toBe(false);
  });

  it("normalizes supported events", () => {
    const event = normalizeWebhook(JSON.parse(rawBody));
    expect(event.type).toBe("mailing.delivered");
    expect(event.mailJobId).toBe("job-1");
  });

  it("rejects unsupported event types", () => {
    expect(() => normalizeWebhook({
      id: "evt-2",
      type: "mailing.unknown",
      mailJobId: "job-1",
      occurredAt: "2026-08-20T10:00:00.000Z",
    })).toThrow("Unsupported webhook event");
  });
});
