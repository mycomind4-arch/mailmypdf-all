import { describe, expect, it, vi } from "vitest";
import { queueMailJobExecution } from "./_fulfillment";

const baseEnv = {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service",
  TRIGGER_SECRET_KEY: "trigger",
};

describe("queueMailJobExecution", () => {
  it("refuses to queue an unknown workflow_id and never contacts Trigger.dev", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const result = await queueMailJobExecution(baseEnv, {
      id: "intent-1",
      business_id: "biz-1",
      mail_job_id: "job-1",
      workflow_id: "some-other-verticals-internal-task",
    });

    expect(result.queued).toBe(false);
    expect(result.reason).toMatch(/unknown workflow/i);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("always targets the real execute-mail-job task with a schema-valid payload, never a workflow-id-keyed URL", async () => {
    const calls: Array<{ url: string; body: string | undefined }> = [];
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      calls.push({ url, body: init?.body as string | undefined });
      if (url.includes("mail_jobs")) {
        return new Response(JSON.stringify([{ id: "job-1", business_id: "biz-1", recipient_id: "recipient-1", document_id: "doc-1", mail_class: "standard", status: "draft" }]), { status: 200 });
      }
      if (url.includes("trigger.dev")) {
        return new Response(JSON.stringify({ id: "run-1" }), { status: 200 });
      }
      if (url.includes("mailing_intents")) {
        return new Response("{}", { status: 200 });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    const result = await queueMailJobExecution(baseEnv, {
      id: "intent-1",
      business_id: "biz-1",
      mail_job_id: "job-1",
      workflow_id: "payment-demand",
    });

    expect(result.queued).toBe(true);
    const triggerCall = calls.find((c) => c.url.includes("trigger.dev"));
    expect(triggerCall).toBeDefined();
    // The bug this guards against: the task URL must never be keyed by
    // workflow_id (e.g. "/tasks/payment-demand/trigger"), which 404s
    // because no such Trigger.dev task exists.
    expect(triggerCall!.url).toContain("/tasks/execute-mail-job/trigger");
    expect(triggerCall!.url).not.toContain("payment-demand");
    const payload = JSON.parse(triggerCall!.body || "{}").payload;
    expect(payload).toMatchObject({
      mailJobId: "job-1",
      businessId: "biz-1",
      recipientId: "recipient-1",
      documentId: "doc-1",
      mailClass: "standard",
      idempotencyKey: "mailing-intent:intent-1",
    });
    fetchSpy.mockRestore();
  });
});
