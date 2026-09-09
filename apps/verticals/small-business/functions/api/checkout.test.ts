import { describe, expect, it, vi } from "vitest";
import { onRequestPost } from "./checkout";

const baseEnv = {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service",
  SUPABASE_ANON_KEY: "anon",
  STRIPE_SECRET_KEY: "sk_test_x",
  APP_URL: "https://app.test",
};

function mockAuthAndMembership() {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    if (url.includes("auth/v1/user")) return new Response(JSON.stringify({ id: "user-1" }), { status: 200 });
    if (url.includes("business_members")) return new Response(JSON.stringify([{ business_id: "biz-1" }]), { status: 200 });
    throw new Error(`Unexpected fetch in test: ${url}`);
  });
}

describe("checkout workflow validation", () => {
  it("rejects an unknown workflowId before ever creating a mailing intent or contacting Stripe", async () => {
    const fetchSpy = mockAuthAndMembership();

    const response = await onRequestPost({
      request: new Request("https://app.test/api/checkout", {
        method: "POST",
        headers: { authorization: "Bearer token" },
        body: JSON.stringify({
          businessId: "biz-1",
          workflowId: "some-other-verticals-internal-task",
          draftContent: "A".repeat(50),
          mailClass: "standard",
          recipient: { name: "Jane Doe" },
        }),
      }),
      env: baseEnv,
    });

    expect(response.status).toBe(400);
    expect(fetchSpy.mock.calls.some(([input]) => String(input).includes("mailing_intents"))).toBe(false);
    expect(fetchSpy.mock.calls.some(([input]) => String(input).includes("stripe.com"))).toBe(false);
    fetchSpy.mockRestore();
  });

  it("accepts a catalog-registered workflowId for this vertical", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes("auth/v1/user")) return new Response(JSON.stringify({ id: "user-1" }), { status: 200 });
      if (url.includes("business_members")) return new Response(JSON.stringify([{ business_id: "biz-1" }]), { status: 200 });
      if (url.includes("mailing_intents") && (init?.method === undefined || init.method === "POST")) {
        return new Response(JSON.stringify([{ id: "intent-1" }]), { status: 201 });
      }
      if (url.includes("mailing_intents") && init?.method === "PATCH") return new Response("{}", { status: 200 });
      if (url.includes("stripe.com")) return new Response(JSON.stringify({ id: "cs_test_1", url: "https://checkout.stripe.com/pay/cs_test_1" }), { status: 200 });
      throw new Error(`Unexpected fetch in test: ${url}`);
    });

    const response = await onRequestPost({
      request: new Request("https://app.test/api/checkout", {
        method: "POST",
        headers: { authorization: "Bearer token" },
        body: JSON.stringify({
          businessId: "biz-1",
          workflowId: "payment-demand",
          draftContent: "A".repeat(50),
          mailClass: "standard",
          recipient: { name: "Jane Doe" },
        }),
      }),
      env: baseEnv,
    });

    expect(response.status).toBe(200);
    fetchSpy.mockRestore();
  });
});
