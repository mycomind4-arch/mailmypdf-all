import { describe, expect, it, vi, beforeEach } from "vitest";
import { mapStatus, MailMyPDFProvider } from "./mailmypdf-provider";
import { MailMyPDFPlatformError } from "./mailmypdf";
import type { MailingOrderDraft, MailingRecipient } from "@/domain/mailing";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const recipient: MailingRecipient = {
  name: "ABC Construction",
  address1: "123 Main St",
  city: "Springfield",
  state: "IL",
  postalCode: "62701",
};

const baseDraft: MailingOrderDraft = {
  workflowId: "contractor-dispute",
  documentId: "doc-1",
  recipient,
  method: "certified",
  idempotencyKey: "matter-1:doc-1",
};

function mockConfig() {
  process.env.MAILMYPDF_API_URL = "https://api.mailmypdf.com";
  process.env.MAILMYPDF_API_KEY = "test-api-key";
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
  vi.resetAllMocks();
  mockConfig();
});

describe("MailMyPDF provider: status mapping", () => {
  it("maps known statuses correctly", () => {
    expect(mapStatus("created")).toBe("submitted");
    expect(mapStatus("submitted")).toBe("submitted");
    expect(mapStatus("mailed")).toBe("mailed");
    expect(mapStatus("sent")).toBe("mailed");
    expect(mapStatus("in_transit")).toBe("in_transit");
    expect(mapStatus("in-transit")).toBe("in_transit");
    expect(mapStatus("delivered")).toBe("delivered");
    expect(mapStatus("failed")).toBe("failed");
    expect(mapStatus("cancelled")).toBe("cancelled");
    expect(mapStatus("canceled")).toBe("cancelled");
    expect(mapStatus("refunded")).toBe("refunded");
  });

  it("throws on unknown status", () => {
    expect(() => mapStatus("unknown_status")).toThrow(/Unknown MailMyPDF fulfillment status/);
  });
});

describe("MailMyPDF provider: createLetter validation", () => {
  it("throws when documentId is missing", async () => {
    const provider = new MailMyPDFProvider();
    await expect(
      provider.createLetter({ ...baseDraft, documentId: "" }),
    ).rejects.toThrow(/documentId/);
  });

  it("throws when idempotency key is empty", async () => {
    const provider = new MailMyPDFProvider();
    await expect(
      provider.createLetter({ ...baseDraft, idempotencyKey: "" }),
    ).rejects.toThrow(/idempotency key/);
  });

  it("throws when idempotency key is whitespace", async () => {
    const provider = new MailMyPDFProvider();
    await expect(
      provider.createLetter({ ...baseDraft, idempotencyKey: "  " }),
    ).rejects.toThrow(/idempotency key/);
  });
});

describe("MailMyPDF provider: getStatus validation", () => {
  it("throws when provider order ID is empty", async () => {
    const provider = new MailMyPDFProvider();
    await expect(provider.getStatus("")).rejects.toThrow(/Provider order ID/);
    await expect(provider.getStatus("  ")).rejects.toThrow(/Provider order ID/);
  });
});

describe("MailMyPDF provider: timeout behavior", () => {
  it("completes normally when the provider responds in time", async () => {
    const provider = new MailMyPDFProvider();
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ id: "comm-1", status: "created" }, 201),
    );
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ id: "comm-1", status: "submitted", updated_at: "2026-08-23T00:00:00.000Z" }),
    );

    const result = await provider.createLetter(baseDraft);
    expect(result.providerOrderId).toBe("comm-1");
  });

  it("throws a timeout error when the provider does not respond within 30 seconds", async () => {
    const provider = new MailMyPDFProvider();
    // Simulate abort: fetch rejects with AbortError
    const abortError = new Error("The operation was aborted.");
    abortError.name = "AbortError";
    mockFetch.mockRejectedValueOnce(abortError);

    try {
      await provider.createLetter(baseDraft);
      expect.fail("Should have thrown a timeout error");
    } catch (err) {
      expect(err).toBeInstanceOf(MailMyPDFPlatformError);
      expect((err as MailMyPDFPlatformError).message).toMatch(/timed out/);
      expect((err as MailMyPDFPlatformError).status).toBe(408);
      expect((err as MailMyPDFPlatformError).code).toBe("TIMEOUT");
    }
  });
});

describe("MailMyPDF provider: HTTP error handling", () => {
  it("throws on HTTP 4xx error", async () => {
    const provider = new MailMyPDFProvider();
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ error: { message: "Bad request", code: "BAD_REQUEST" } }, 400),
    );

    await expect(provider.createLetter(baseDraft)).rejects.toThrow(
      /Bad request/,
    );
  });

  it("throws on HTTP 5xx error", async () => {
    const provider = new MailMyPDFProvider();
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ error: { message: "Internal server error" } }, 500),
    );

    await expect(provider.createLetter(baseDraft)).rejects.toThrow(
      /Internal server error/,
    );
  });

  it("throws when provider returns no communication ID", async () => {
    const provider = new MailMyPDFProvider();
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: "" }, 201));

    await expect(provider.createLetter(baseDraft)).rejects.toThrow(
      /no provider order ID/,
    );
  });

  it("throws on malformed JSON response", async () => {
    const provider = new MailMyPDFProvider();
    const malformedResponse = {
      ok: true,
      status: 200,
      text: () => Promise.resolve("not valid json{{{"),
    } as Response;
    mockFetch.mockResolvedValueOnce(malformedResponse);

    // Should not crash — the request function handles JSON parse errors
    // and the provider should throw because the response has no valid id
    await expect(provider.createLetter(baseDraft)).rejects.toThrow();
  });
});

describe("MailMyPDF provider: authentication", () => {
  it("sends Bearer token in Authorization header", async () => {
    const provider = new MailMyPDFProvider();
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ id: "comm-auth" }, 201),
    );

    await provider.createLetter(baseDraft);

    const call = mockFetch.mock.calls[0];
    const headers = new Headers(call[1]?.headers);
    expect(headers.get("Authorization")).toBe("Bearer test-api-key");
  });

  it("sends Idempotency-Key header", async () => {
    const provider = new MailMyPDFProvider();
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ id: "comm-idem" }, 201),
    );

    await provider.createLetter(baseDraft);

    const call = mockFetch.mock.calls[0];
    const headers = new Headers(call[1]?.headers);
    expect(headers.get("Idempotency-Key")).toBe("matter-1:doc-1");
  });
});

describe("MailMyPDF provider: getStatus response validation", () => {
  it("returns mapped status and tracking number", async () => {
    const provider = new MailMyPDFProvider();
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        id: "comm-1",
        status: "in_transit",
        tracking_number: "TRK-123",
        updated_at: "2026-08-23T00:00:00.000Z",
      }),
    );

    const status = await provider.getStatus("comm-1");
    expect(status.state).toBe("in_transit");
    expect(status.trackingNumber).toBe("TRK-123");
  });

  it("provides a timestamp when updated_at is missing", async () => {
    const provider = new MailMyPDFProvider();
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ id: "comm-1", status: "mailed" }),
    );

    const status = await provider.getStatus("comm-1");
    expect(status.state).toBe("mailed");
    expect(status.updatedAt).toBeTruthy();
  });
});
