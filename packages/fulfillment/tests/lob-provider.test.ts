import assert from "node:assert/strict";
import test from "node:test";
import {
  createLobLetter,
  normalizeLobStatus,
  verifyLobWebhook,
} from "../src/lob-provider.js";

const address = {
  name: "Jane Doe",
  line1: "123 Main St",
  city: "Eureka",
  state: "CA",
  postal: "95501",
};

test("Lob provider preserves idempotency key and packet URL", async () => {
  let headers: HeadersInit | undefined;
  let body = "";

  const result = await createLobLetter(
    {
      referenceId: "order-123",
      pdfUrl: "https://example.test/packet.pdf",
      to: address,
      from: address,
      idempotencyKey: "mail:packet-hash",
      extraService: "certified",
    },
    {
      apiKey: "test-key",
      maxAttempts: 1,
      fetchImpl: async (_url, init) => {
        headers = init?.headers;
        body = String(init?.body ?? "");
        return new Response(
          JSON.stringify({
            id: "ltr_test_123",
            status: "created",
            tracking_number: "TRACK123",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      },
    },
  );

  const normalized = new Headers(headers);
  assert.equal(normalized.get("Idempotency-Key"), "mail:packet-hash");
  assert.match(body, /file=https%3A%2F%2Fexample.test%2Fpacket.pdf/);
  assert.match(body, /extra_service=certified/);
  assert.equal(result.id, "ltr_test_123");
  assert.equal(result.trackingNumber, "TRACK123");
});

test("Lob provider retries only transient provider failures", async () => {
  let calls = 0;
  const result = await createLobLetter(
    {
      referenceId: "order-456",
      pdfUrl: "https://example.test/packet.pdf",
      to: address,
      from: address,
      idempotencyKey: "mail:retry",
    },
    {
      apiKey: "test-key",
      baseDelayMs: 0,
      maxAttempts: 2,
      fetchImpl: async () => {
        calls += 1;
        if (calls === 1) return new Response("busy", { status: 503 });
        return new Response(JSON.stringify({ id: "ltr_retry", status: "processed" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
    },
  );

  assert.equal(calls, 2);
  assert.equal(result.id, "ltr_retry");
});

test("Lob status normalization is fail-closed", () => {
  assert.equal(normalizeLobStatus("processed"), "provider_processing");
  assert.equal(normalizeLobStatus("in_local_area"), "in_transit");
  assert.equal(normalizeLobStatus("returned_to_sender"), "returned");
  assert.throws(() => normalizeLobStatus("mystery-status"), /Unknown Lob status/);
});

test("Lob webhook verifier validates HMAC and timestamp", async () => {
  const secret = "whsec_test";
  const timestamp = "1730000000000";
  const raw = JSON.stringify({ id: "evt_1", event_type: { id: "letter.delivered" } });

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${raw}`),
  );
  const signature = Array.from(new Uint8Array(signed), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");

  const request = new Request("https://example.test/webhook", {
    method: "POST",
    headers: {
      "lob-signature": signature,
      "lob-signature-timestamp": timestamp,
    },
    body: raw,
  });

  const verified = await verifyLobWebhook(request, secret, {
    now: Number(timestamp),
  });

  assert.deepEqual(verified.event, {
    id: "evt_1",
    event_type: { id: "letter.delivered" },
  });
});
