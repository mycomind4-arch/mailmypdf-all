import { describe, expect, it, vi, beforeEach } from "vitest";
import { SupabaseMailingIntentRepository } from "./supabase-mailing-intent-repository";
import { MailingIntentConflictError } from "@/domain/mailing-intent-repository";
import type { MailingRecipient, MailingMethod } from "@/domain/mailing";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const recipient: MailingRecipient = {
  name: "ABC Construction",
  address1: "123 Main St",
  city: "Springfield",
  state: "IL",
  postalCode: "62701",
};

const claimInput = {
  ownerId: "user-1",
  idempotencyKey: "matter-1:doc-1",
  workflowId: "contractor-dispute",
  matterId: "matter-1",
  mailingMethod: "certified" as MailingMethod,
  draftContent: "[DRAFT] test",
  draftHash: "hash-abc",
  recipient,
  matterReference: "matter-1",
  matterType: "private-office",
  stripePaymentId: "pi_test_123",
};

function mockConfig() {
  process.env.SUPABASE_URL = "https://test.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
}

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockConfig();
});

describe("SupabaseMailingIntentRepository: claim", () => {
  it("creates a new pending intent when none exists", async () => {
    const repo = new SupabaseMailingIntentRepository();
    const intentRow = {
      id: "intent-1",
      owner_id: "user-1",
      workflow_id: "contractor-dispute",
      matter_id: "matter-1",
      status: "pending",
      mailing_method: "certified",
      draft_hash: "hash-abc",
      provider_order_id: null,
      tracking_number: null,
      idempotency_key: "matter-1:doc-1",
      error_message: null,
      created_at: "2026-08-23T00:00:00.000Z",
      updated_at: "2026-08-23T00:00:00.000Z",
    };
    mockFetch.mockResolvedValueOnce(jsonResponse([intentRow], 201));

    const result = await repo.claim(claimInput);

    expect(result.isNew).toBe(true);
    expect(result.intent.id).toBe("intent-1");
    expect(result.intent.status).toBe("pending");
    expect(mockFetch).toHaveBeenCalledTimes(1);
    // Verify the INSERT was a POST
    const call = mockFetch.mock.calls[0];
    expect(call[1]?.method).toBe("POST");
  });

  it("returns cached result when intent is already submitted (idempotent)", async () => {
    const repo = new SupabaseMailingIntentRepository();
    const intentRow = {
      id: "intent-1",
      owner_id: "user-1",
      workflow_id: "contractor-dispute",
      matter_id: "matter-1",
      status: "submitted",
      mailing_method: "certified",
      draft_hash: "hash-abc",
      provider_order_id: "comm-123",
      tracking_number: "TRK-1",
      idempotency_key: "matter-1:doc-1",
      error_message: null,
      created_at: "2026-08-23T00:00:00.000Z",
      updated_at: "2026-08-23T00:01:00.000Z",
    };
    // INSERT fails (409 conflict)
    mockFetch.mockResolvedValueOnce(jsonResponse({ error: "conflict" }, 409));
    // GET returns the existing submitted intent
    mockFetch.mockResolvedValueOnce(jsonResponse([intentRow], 200));

    const result = await repo.claim(claimInput);

    expect(result.isNew).toBe(false);
    expect(result.intent.status).toBe("submitted");
    expect(result.intent.providerOrderId).toBe("comm-123");
  });

  it("throws conflict when intent is pending (concurrent request)", async () => {
    const repo = new SupabaseMailingIntentRepository();
    const intentRow = {
      id: "intent-1",
      owner_id: "user-1",
      workflow_id: "contractor-dispute",
      matter_id: "matter-1",
      status: "pending",
      mailing_method: "certified",
      draft_hash: "hash-abc",
      provider_order_id: null,
      tracking_number: null,
      idempotency_key: "matter-1:doc-1",
      error_message: null,
      created_at: "2026-08-23T00:00:00.000Z",
      updated_at: "2026-08-23T00:00:00.000Z",
    };
    // INSERT fails
    mockFetch.mockResolvedValueOnce(jsonResponse({ error: "conflict" }, 409));
    // GET returns pending intent
    mockFetch.mockResolvedValueOnce(jsonResponse([intentRow], 200));

    await expect(repo.claim(claimInput)).rejects.toThrow(
      MailingIntentConflictError,
    );
  });

  it("reclaims a failed intent for retry", async () => {
    const repo = new SupabaseMailingIntentRepository();
    const failedRow = {
      id: "intent-1",
      owner_id: "user-1",
      workflow_id: "contractor-dispute",
      matter_id: "matter-1",
      status: "failed",
      mailing_method: "certified",
      draft_hash: "hash-abc",
      provider_order_id: null,
      tracking_number: null,
      idempotency_key: "matter-1:doc-1",
      error_message: "Provider error",
      created_at: "2026-08-23T00:00:00.000Z",
      updated_at: "2026-08-23T00:00:00.000Z",
    };
    const reclaimedRow = { ...failedRow, status: "pending", error_message: null };

    // INSERT fails
    mockFetch.mockResolvedValueOnce(jsonResponse({ error: "conflict" }, 409));
    // GET returns failed intent
    mockFetch.mockResolvedValueOnce(jsonResponse([failedRow], 200));
    // PATCH to update status to pending
    mockFetch.mockResolvedValueOnce(jsonResponse({}, 204));
    // GET returns reclaimed intent
    mockFetch.mockResolvedValueOnce(jsonResponse([reclaimedRow], 200));

    const result = await repo.claim(claimInput);

    expect(result.isNew).toBe(true);
    expect(result.intent.status).toBe("pending");
  });

  it("throws if INSERT fails and no existing intent is found", async () => {
    const repo = new SupabaseMailingIntentRepository();
    // INSERT fails
    mockFetch.mockResolvedValueOnce(jsonResponse({ error: "conflict" }, 409));
    // GET returns empty
    mockFetch.mockResolvedValueOnce(jsonResponse([], 200));

    await expect(repo.claim(claimInput)).rejects.toThrow(/insert failed/);
  });
});

describe("SupabaseMailingIntentRepository: markSubmitted", () => {
  it("updates intent to submitted with provider order ID", async () => {
    const repo = new SupabaseMailingIntentRepository();
    mockFetch.mockResolvedValueOnce(jsonResponse({}, 204));

    await repo.markSubmitted("matter-1:doc-1", "user-1", "comm-123", "TRK-1");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const call = mockFetch.mock.calls[0];
    expect(call[1]?.method).toBe("PATCH");
    const body = JSON.parse(call[1]?.body as string);
    expect(body.status).toBe("submitted");
    expect(body.provider_order_id).toBe("comm-123");
    expect(body.tracking_number).toBe("TRK-1");
  });

  it("throws if the update fails", async () => {
    const repo = new SupabaseMailingIntentRepository();
    mockFetch.mockResolvedValueOnce(jsonResponse({ error: "failed" }, 500));

    await expect(
      repo.markSubmitted("matter-1:doc-1", "user-1", "comm-123"),
    ).rejects.toThrow(/status update failed/);
  });
});

describe("SupabaseMailingIntentRepository: markFailed", () => {
  it("updates intent to failed with error message", async () => {
    const repo = new SupabaseMailingIntentRepository();
    mockFetch.mockResolvedValueOnce(jsonResponse({}, 204));

    await repo.markFailed("matter-1:doc-1", "user-1", "Provider timeout");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const call = mockFetch.mock.calls[0];
    expect(call[1]?.method).toBe("PATCH");
    const body = JSON.parse(call[1]?.body as string);
    expect(body.status).toBe("failed");
    expect(body.error_message).toBe("Provider timeout");
  });
});

describe("SupabaseMailingIntentRepository: uniqueness", () => {
  it("uses idempotency_key and owner_id for deduplication", async () => {
    const repo = new SupabaseMailingIntentRepository();
    const intentRow = {
      id: "intent-1",
      owner_id: "user-1",
      workflow_id: "contractor-dispute",
      matter_id: "matter-1",
      status: "submitted",
      mailing_method: "certified",
      draft_hash: "hash-abc",
      provider_order_id: "comm-123",
      tracking_number: null,
      idempotency_key: "matter-1:doc-1",
      error_message: null,
      created_at: "2026-08-23T00:00:00.000Z",
      updated_at: "2026-08-23T00:00:00.000Z",
    };
    // INSERT fails (unique constraint)
    mockFetch.mockResolvedValueOnce(jsonResponse({ error: "conflict" }, 409));
    // GET by idempotency_key + owner_id
    mockFetch.mockResolvedValueOnce(jsonResponse([intentRow], 200));

    const result = await repo.claim(claimInput);

    // Verify the GET URL filters by idempotency_key and owner_id
    const getUrl = mockFetch.mock.calls[1][0] as string;
    expect(getUrl).toContain("idempotency_key=eq.matter-1%3Adoc-1");
    expect(getUrl).toContain("owner_id=eq.user-1");

    expect(result.isNew).toBe(false);
    expect(result.intent.providerOrderId).toBe("comm-123");
  });
});
