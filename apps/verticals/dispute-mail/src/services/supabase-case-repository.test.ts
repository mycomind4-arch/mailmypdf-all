import { afterEach, describe, expect, it, vi } from "vitest";
import { SupabaseCaseRepository } from "./supabase-case-repository";

const originalUrl = process.env.SUPABASE_URL;
const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const originalFetch = globalThis.fetch;

afterEach(() => {
  if (originalUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = originalUrl;
  if (originalKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("SupabaseCaseRepository", () => {
  it("fails closed when server persistence is not configured", async () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    await expect(new SupabaseCaseRepository().list("user-1")).rejects.toThrow(/SUPABASE_URL/);
  });

  it("creates an owner-scoped case with a server-generated identifier", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
    const createdRow = {
      id: "case-1", owner_id: "user-1", workflow_id: "credit-report", document_id: "doc-1", status: "draft", version: 1,
      created_at: "2026-08-20T00:00:00.000Z", updated_at: "2026-08-20T00:00:00.000Z", approved_at: null, submitted_at: null, provider_order_id: null, tracking_number: null, proof_hash: null,
    };
    globalThis.fetch = vi.fn(async (input, init) => {
      expect(String(input)).toBe("https://example.supabase.co/rest/v1/dispute_cases");
      expect(init?.method).toBe("POST");
      expect(JSON.parse(String(init?.body)).owner_id).toBe("user-1");
      return new Response(JSON.stringify([createdRow]), { status: 201 });
    });
    const created = await new SupabaseCaseRepository().create({ ownerId: "user-1", workflowId: "credit-report", documentId: "doc-1" });
    expect(created.ownerId).toBe("user-1");
    expect(created.workflowId).toBe("credit-report");
  });

  it("uses owner and expected version in updates", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
    globalThis.fetch = vi.fn(async (input, init) => {
      const url = String(input);
      expect(url).toContain("owner_id=eq.user-1");
      expect(url).toContain("version=eq.4");
      expect(init?.method).toBe("PATCH");
      return new Response("[]", { status: 200 });
    });
    await expect(new SupabaseCaseRepository().update("user-1", "case-1", 4, { trackingNumber: "TRK-1" })).rejects.toThrow(/changed since/);
  });
});
