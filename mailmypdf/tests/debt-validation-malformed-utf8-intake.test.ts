import assert from "node:assert/strict";
import test from "node:test";
import { createDebtValidationIntakeHttpHandler } from "../src/lib/secure-core/debt-validation-intake-http.server";

test("malformed UTF-8 intake fails closed before private notice lookup or persistence", async () => {
  let reads = 0;
  let writes = 0;
  const origin = "https://mailmypdf.example";
  const handler = createDebtValidationIntakeHttpHandler({
    allowedOrigin: origin,
    authenticate: async () => ({ id: "synthetic-owner" }),
    loadVerifiedNotice: async () => {
      reads++;
      return null;
    },
    persistPreparedMatter: async () => {
      writes++;
      throw new Error("must_not_persist");
    },
  });
  const response = await handler(new Request(origin + "/api/debt-validation/intake", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    // Invalid UTF-8 byte sequence, not a Unicode replacement character.
    body: new Uint8Array([0x7b, 0x22, 0x78, 0x22, 0x3a, 0x22, 0xc3, 0x28, 0x22, 0x7d]),
  }));
  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, "invalid_json");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(reads, 0);
  assert.equal(writes, 0);
});

test("truncated UTF-8 split across streamed chunks fails closed before notice access", async () => {
  let reads = 0;
  let writes = 0;
  const origin = "https://mailmypdf.example";
  const handler = createDebtValidationIntakeHttpHandler({
    allowedOrigin: origin,
    authenticate: async () => ({ id: "synthetic-owner" }),
    loadVerifiedNotice: async () => {
      reads++;
      return null;
    },
    persistPreparedMatter: async () => {
      writes++;
      throw new Error("must_not_persist");
    },
  });
  // A leading multibyte sequence in one chunk is not completed by the
  // following chunk. The handler must decode the assembled bytes strictly.
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array([0x7b, 0x22, 0x78, 0x22, 0x3a, 0x22, 0xe2]));
      controller.enqueue(new Uint8Array([0x82, 0x22, 0x7d]));
      controller.close();
    },
  });
  const response = await handler(new Request(origin + "/api/debt-validation/intake", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: stream,
    duplex: "half",
  } as RequestInit));
  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, "invalid_json");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(reads, 0);
  assert.equal(writes, 0);
});

test("valid multibyte UTF-8 split across chunks is decoded before field validation", async () => {
  let reads = 0;
  let writes = 0;
  const origin = "https://mailmypdf.example";
  const handler = createDebtValidationIntakeHttpHandler({
    allowedOrigin: origin,
    authenticate: async () => ({ id: "synthetic-owner" }),
    loadVerifiedNotice: async () => {
      reads++;
      return null;
    },
    persistPreparedMatter: async () => {
      writes++;
      throw new Error("must_not_persist");
    },
  });
  // {"x":"€"} is valid JSON; the euro sign spans three UTF-8 bytes.
  // An unknown field should be rejected as untrusted, not as invalid JSON.
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array([0x7b, 0x22, 0x78, 0x22, 0x3a, 0x22, 0xe2]));
      controller.enqueue(new Uint8Array([0x82]));
      controller.enqueue(new Uint8Array([0xac, 0x22, 0x7d]));
      controller.close();
    },
  });
  const response = await handler(new Request(origin + "/api/debt-validation/intake", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: stream,
    duplex: "half",
  } as RequestInit));
  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, "untrusted_intake_fields");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(reads, 0);
  assert.equal(writes, 0);
});
