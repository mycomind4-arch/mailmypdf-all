import { describe, expect, it } from "vitest";
import { canQueueMailJob, validatePreparedMailJob } from "./mail-job-integrity";

describe("Business mail-job integrity", () => {
  it("requires a complete durable identity", () => {
    expect(() => validatePreparedMailJob({ intentId:"i", mailJobId:"j", recipientId:"r", documentId:"d", idempotencyKey:"mailing-intent:i" })).not.toThrow();
    expect(() => validatePreparedMailJob({ intentId:"i", mailJobId:"j", recipientId:"r", documentId:"", idempotencyKey:"mailing-intent:i" })).toThrow("documentId is required");
  });
  it("binds idempotency to the durable intent", () => {
    expect(() => validatePreparedMailJob({ intentId:"i", mailJobId:"j", recipientId:"r", documentId:"d", idempotencyKey:"other" })).toThrow(/idempotency key/);
  });
  it("only permits draft or already-queued jobs to enter queueing", () => {
    expect(canQueueMailJob("draft")).toBe(true);
    expect(canQueueMailJob("queued")).toBe(true);
    expect(canQueueMailJob("mailed")).toBe(false);
    expect(canQueueMailJob("delivered")).toBe(false);
  });
});
