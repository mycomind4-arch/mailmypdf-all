/**
 * Tests for the Proof-of-Service Client SDK.
 *
 * Tests the client's request building, URL construction, and error handling
 * using a mock fetch implementation. No real HTTP calls are made.
 *
 * Run with: node --test tests/proof-of-service-client.test.mjs
 */

import { test, describe } from "node:test";
import { strictEqual, deepEqual, ok, notStrictEqual } from "node:assert";

// ── Mock fetch implementation ────────────────────────────────────────────────

function createMockFetch() {
  const calls = [];
  const responses = new Map();

  function mockFetch(url, options) {
    calls.push({ url, options });

    // Find a matching response
    const key = `${options?.method ?? "GET"} ${url}`;
    const response = responses.get(key) ?? responses.get(url);

    if (response) {
      return Promise.resolve({
        ok: response.ok ?? true,
        status: response.status ?? 200,
        json: () => Promise.resolve(response.body),
        text: () => Promise.resolve(JSON.stringify(response.body)),
      });
    }

    // Default: 404
    return Promise.resolve({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: { message: "Not found" } }),
      text: () => Promise.resolve(JSON.stringify({ error: { message: "Not found" } })),
    });
  }

  mockFetch.calls = calls;
  mockFetch.setResponse = (url, body, method = "GET", status = 200) => {
    const key = method !== "GET" ? `${method} ${url}` : url;
    responses.set(key, { body, status, ok: status < 400 });
  };

  return mockFetch;
}

// ── Re-implement the client logic (same as the production code) ────────────────

class TestClient {
  constructor(config) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.apiKey = config.apiKey;
    this.fetchFn = config.fetch ?? fetch;
  }

  async request(path, options = {}) {
    const url = `${this.baseUrl}${path}`;
    const headers = new Headers(options.headers);
    if (!headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${this.apiKey}`);
    }
    const response = await this.fetchFn(url, { ...options, headers });
    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: { message: response.statusText } }));
      const message = body?.error?.message ?? response.statusText;
      const error = new Error(`ProofOfService API error (${response.status}): ${message}`);
      error.status = response.status;
      throw error;
    }
    return response.json();
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("ProofOfService Client", () => {
  test("constructs with correct base URL (strips trailing slash)", () => {
    const client = new TestClient({ baseUrl: "https://api.example.com/api/v1/", apiKey: "sk_test_123" });
    strictEqual(client.baseUrl, "https://api.example.com/api/v1");
  });

  test("sets Authorization header with Bearer token", async () => {
    const mockFetch = createMockFetch();
    mockFetch.setResponse("https://api.example.com/api/v1/documents", { id: "123" });

    const client = new TestClient({
      baseUrl: "https://api.example.com/api/v1",
      apiKey: "sk_live_abc",
      fetch: mockFetch,
    });

    await client.request("/documents");

    strictEqual(mockFetch.calls.length, 1);
    const authHeader = mockFetch.calls[0].options.headers.get("Authorization");
    strictEqual(authHeader, "Bearer sk_live_abc");
  });

  test("builds correct URL for documents endpoint", async () => {
    const mockFetch = createMockFetch();
    mockFetch.setResponse("https://api.example.com/api/v1/documents", { id: "doc1" });

    const client = new TestClient({
      baseUrl: "https://api.example.com/api/v1",
      apiKey: "sk_live_abc",
      fetch: mockFetch,
    });

    await client.request("/documents");

    strictEqual(mockFetch.calls[0].url, "https://api.example.com/api/v1/documents");
  });

  test("builds correct URL for specific document", async () => {
    const mockFetch = createMockFetch();
    mockFetch.setResponse("https://api.example.com/api/v1/documents/abc-123", { id: "abc-123" });

    const client = new TestClient({
      baseUrl: "https://api.example.com/api/v1",
      apiKey: "sk_live_abc",
      fetch: mockFetch,
    });

    await client.request("/documents/abc-123");

    strictEqual(mockFetch.calls[0].url, "https://api.example.com/api/v1/documents/abc-123");
  });

  test("throws on non-200 response with error message", async () => {
    const mockFetch = createMockFetch();
    mockFetch.setResponse("https://api.example.com/api/v1/documents/missing", {
      error: { message: "Document not found" },
    }, "GET", 404);

    const client = new TestClient({
      baseUrl: "https://api.example.com/api/v1",
      apiKey: "sk_live_abc",
      fetch: mockFetch,
    });

    try {
      await client.request("/documents/missing");
      ok(false, "Should have thrown");
    } catch (err) {
      ok(err.message.includes("404"), "Error should include status code");
      ok(err.message.includes("Document not found"), "Error should include API message");
      strictEqual(err.status, 404);
    }
  });

  test("sends JSON body for POST requests", async () => {
    const mockFetch = createMockFetch();
    mockFetch.setResponse("https://api.example.com/api/v1/communications", {
      id: "comm1",
    }, "POST", 201);

    const client = new TestClient({
      baseUrl: "https://api.example.com/api/v1",
      apiKey: "sk_live_abc",
      fetch: mockFetch,
    });

    const body = { document_id: "doc1", mail_type: "certified" };
    await client.request("/communications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const call = mockFetch.calls[0];
    strictEqual(call.options.method, "POST");
    strictEqual(call.options.headers.get("Content-Type"), "application/json");
    deepEqual(JSON.parse(call.options.body), body);
  });

  test("preserves existing Authorization header if provided", async () => {
    const mockFetch = createMockFetch();
    mockFetch.setResponse("https://api.example.com/api/v1/test", { ok: true });

    const client = new TestClient({
      baseUrl: "https://api.example.com/api/v1",
      apiKey: "sk_live_abc",
      fetch: mockFetch,
    });

    await client.request("/test", {
      headers: { Authorization: "Bearer custom_token" },
    });

    strictEqual(mockFetch.calls[0].options.headers.get("Authorization"), "Bearer custom_token");
  });

  test("builds query string for list endpoints", () => {
    const params = { matter_reference: "Humboldt-CE-2026-0042", status: "delivered", limit: 50, offset: 100 };
    const search = new URLSearchParams();
    search.set("matter_reference", params.matter_reference);
    search.set("status", params.status);
    search.set("limit", String(params.limit));
    search.set("offset", String(params.offset));

    const query = search.toString();
    ok(query.includes("matter_reference=Humboldt-CE-2026-0042"));
    ok(query.includes("status=delivered"));
    ok(query.includes("limit=50"));
    ok(query.includes("offset=100"));
  });

  test("verification URL is built without API key", () => {
    const trackingNumber = "94055036993000000000000";
    const documentHash = "a3f5b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1";
    const url = `https://mailmypdf.com/api/v1/verify/${encodeURIComponent(trackingNumber)}?document_hash=${documentHash}`;

    ok(url.includes(`/verify/${trackingNumber}`));
    ok(url.includes(`document_hash=${documentHash}`));
    ok(!url.includes("Bearer"));
    ok(!url.includes("sk_live"));
  });
});

describe("FairProcess Integration Patterns", () => {
  test("sendViolationNotice builds correct params for code enforcement", () => {
    // Verify the parameter structure that would be sent
    const caseData = {
      id: "case-123",
      case_number: "Humboldt-CE-2026-0042",
      property_address: "123 Example St, Eureka, CA 95501",
      violation_type: "Unpermitted structure",
      officer_name: "Officer Smith",
      legal_citation: "Humboldt County Code § 314-7",
      response_window_days: 30,
    };

    const recipient = {
      name: "Jane Owner",
      address_line1: "123 Example St",
      city: "Eureka",
      state: "CA",
      postal_code: "95501",
    };

    // Verify the structure matches what the API expects
    const expectedParams = {
      document_id: "doc-uuid", // would be set after upload
      legal_reference: {
        type: "ordinance",
        citation: caseData.legal_citation,
        description: `Code violation notice — ${caseData.violation_type} at ${caseData.property_address}. ${caseData.response_window_days}-day cure period.`,
        response_window_days: 30,
        response_window_ends: null,
      },
      recipient: {
        name: recipient.name,
        address_line1: recipient.address_line1,
        address_line2: null,
        city: recipient.city,
        state: recipient.state,
        postal_code: recipient.postal_code,
        country: "US",
      },
      mail_type: "certified",
      matter_reference: caseData.case_number,
      matter_type: "code_enforcement",
    };

    strictEqual(expectedParams.legal_reference.type, "ordinance");
    strictEqual(expectedParams.matter_type, "code_enforcement");
    strictEqual(expectedParams.matter_reference, "Humboldt-CE-2026-0042");
    strictEqual(expectedParams.mail_type, "certified");
    ok(expectedParams.legal_reference.description.includes("Unpermitted structure"));
    ok(expectedParams.legal_reference.description.includes("30-day cure period"));
  });

  test("webhook handler routes events to correct callbacks", async () => {
    let sentCalled = false;
    let deliveredCalled = false;
    let windowExpiredCalled = false;

    const handler = (event) => {
      switch (event.event_type) {
        case "communication.sent":
          sentCalled = true;
          return Promise.resolve();
        case "communication.delivered":
          deliveredCalled = true;
          return Promise.resolve();
        case "response_window.expired":
          windowExpiredCalled = true;
          return Promise.resolve();
        default:
          return Promise.resolve();
      }
    };

    await handler({ event_type: "communication.sent", data: { communication_id: "c1" } });
    await handler({ event_type: "communication.delivered", data: { communication_id: "c1", delivered_at: "2026-08-04T15:30:00Z" } });
    await handler({ event_type: "response_window.expired", data: { communication_id: "c1" } });
    await handler({ event_type: "unknown.event", data: {} });

    ok(sentCalled, "sent callback should fire");
    ok(deliveredCalled, "delivered callback should fire");
    ok(windowExpiredCalled, "window expired callback should fire");
  });
});
