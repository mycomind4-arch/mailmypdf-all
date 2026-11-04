import assert from "node:assert/strict";
import test from "node:test";
import { createDebtValidationHostIntakeHandler } from "../src/lib/secure-core/debt-validation-host-review.server";

const origin = "https://mailmypdf.example";

test("host intake fails closed when identity verification errors before reading a private notice", async () => {
  let sourceReads = 0;
  let writes = 0;
  const handler = createDebtValidationHostIntakeHandler({
    allowedOrigin: origin,
    loadVerifiedNotice: async () => {
      sourceReads++;
      throw new Error("private notice must not be read");
    },
    persistPreparedMatter: async () => {
      writes++;
      throw new Error("packet must not be persisted");
    },
  }, async () => {
    throw new Error("identity provider temporarily unavailable");
  });
  const response = await handler(new Request(origin + "/api/debt-validation/intake", {
    method: "POST",
    headers: { origin, "content-type": "application/json", authorization: "Bearer synthetic" },
    body: JSON.stringify({ matterId: "synthetic-matter" }),
  }));
  assert.equal(response.status, 401);
  assert.equal(sourceReads, 0);
  assert.equal(writes, 0);
  assert.equal(response.headers.get("cache-control"), "no-store");
});
