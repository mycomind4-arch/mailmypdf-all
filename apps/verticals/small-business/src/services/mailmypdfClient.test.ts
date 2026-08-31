import { describe, expect, it, vi } from "vitest";
import { MailMyPDFClient } from "./mailmypdfClient";

describe("MailMyPDFClient execution response integrity", () => {
  const input = {
    mailJobId: "job-1",
    businessId: "business-1",
    recipientId: "recipient-1",
    documentId: "document-1",
    mailClass: "certified" as const,
    idempotencyKey: "business:job-1:2026-08-20T10:00:00.000Z",
  };

  it("rejects malformed success payloads", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 })));
    const client = new MailMyPDFClient("https://mail.example", "secret");

    await expect(client.executeMailJob(input)).rejects.toThrow("invalid execution payload");
  });

  it("rejects provider responses for a different mail job", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ mailJobId: "job-2", status: "submitted" }), { status: 200 }),
      ),
    );
    const client = new MailMyPDFClient("https://mail.example", "secret");

    await expect(client.executeMailJob(input)).rejects.toThrow("different mail job");
  });

  it("accepts a valid execution response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ mailJobId: "job-1", status: "submitted", trackingNumber: "9400" , proofId: "proof-1" }), { status: 200 }),
      ),
    );
    const client = new MailMyPDFClient("https://mail.example", "secret");

    await expect(client.executeMailJob(input)).resolves.toEqual({
      mailJobId: "job-1",
      status: "submitted",
      trackingNumber: "9400",
      proofId: "proof-1",
    });
  });
});
