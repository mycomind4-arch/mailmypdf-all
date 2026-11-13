import assert from "node:assert/strict";
import test from "node:test";
import { createDebtValidationIntakeHttpHandler } from "../src/lib/secure-core/debt-validation-intake-http.server";

test("same-site sibling-origin fetch metadata cannot reach authentication or private notice storage", async () => {
  const origin = "https://mailmypdf.example";
  let authCalls = 0;
  let noticeReads = 0;
  let packetWrites = 0;
  const handler = createDebtValidationIntakeHttpHandler({
    allowedOrigin: origin,
    authenticate: async () => { authCalls++; return { id: "synthetic-owner" }; },
    loadVerifiedNotice: async () => { noticeReads++; throw new Error("unexpected_private_read"); },
    persistPreparedMatter: async () => { packetWrites++; throw new Error("unexpected_private_write"); },
  });

  // A request with a matching Origin must still fail if browser fetch metadata
  // says it came from another same-site origin (for example a sibling subdomain).
  const response = await handler(new Request(origin + "/api/debt-validation/intake", {
    method: "POST",
    headers: {
      origin,
      "sec-fetch-site": "same-site",
      "content-type": "application/json",
    },
    body: JSON.stringify({ matterId: "synthetic-matter" }),
  }));
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { code: "origin_not_allowed" });
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(authCalls, 0);
  assert.equal(noticeReads, 0);
  assert.equal(packetWrites, 0);
});
