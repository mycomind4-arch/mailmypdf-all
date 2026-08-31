import { describe, expect, it, vi } from "vitest";
import { onRequestPost } from "./trigger-paid";

describe("paid Trigger bridge", () => {
  it("rejects unpaid intents before contacting Trigger", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service";
    process.env.SUPABASE_ANON_KEY = "anon";
    process.env.TRIGGER_SECRET_KEY = "trigger";
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("auth/v1/user")) return new Response(JSON.stringify({ id: "user-1" }), { status: 200 });
      return new Response(JSON.stringify([{ id: "intent-1", status: "pending", workflow_id: "payment-demand", business_id: "biz-1" }]), { status: 200 });
    });

    const response = await onRequestPost({
      request: new Request("https://app.test/api/trigger-paid", { method: "POST", headers: { authorization: "Bearer token" }, body: JSON.stringify({ mailingIntentId: "intent-1" }) }),
      env: { SUPABASE_URL: process.env.SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: "service", SUPABASE_ANON_KEY: "anon", TRIGGER_SECRET_KEY: "trigger" },
    });
    expect(response.status).toBe(409);
    expect(fetchSpy.mock.calls.some(([input]) => String(input).includes("trigger.dev"))).toBe(false);
    fetchSpy.mockRestore();
  });
});
