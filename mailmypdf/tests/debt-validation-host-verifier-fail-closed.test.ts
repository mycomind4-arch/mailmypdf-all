import assert from "node:assert/strict";
import test from "node:test";
import { createDebtValidationHostIntakeHandler, createDebtValidationHostReviewAndApprovalHandlers, createDebtValidationHostCheckoutHandler } from "../src/lib/secure-core/debt-validation-host-review.server";

import type { DebtValidationMatterRepository } from "../../dispute-mail/workflows/debt-validation/server-matter-approval";

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

test("host intake rejects an identity provider returning a blank user ID without touching private storage", async () => {
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
  }, async () => ({ user: { id: "   " } }));
  const response = await handler(new Request(origin + "/api/debt-validation/intake", {
    method: "POST",
    headers: { origin, "content-type": "application/json", authorization: "Bearer synthetic" },
    body: JSON.stringify({ matterId: "synthetic-matter" }),
  }));
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { code: "authentication_required" });
  assert.equal(sourceReads, 0);
  assert.equal(writes, 0);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("host intake rejects a malformed non-string verified user ID without private storage access", async () => {
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
  }, async () => ({ user: { id: 12345 as unknown as string } }));
  const response = await handler(new Request(origin + "/api/debt-validation/intake", {
    method: "POST",
    headers: { origin, "content-type": "application/json", authorization: "Bearer synthetic" },
    body: JSON.stringify({ matterId: "synthetic-matter" }),
  }));
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { code: "authentication_required" });
  assert.equal(sourceReads, 0);
  assert.equal(writes, 0);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("host approval rejects malformed verified identity before reading or changing a matter", async () => {
  let repositoryCalls = 0;
  const repository = new Proxy({}, {
    get() {
      repositoryCalls++;
      throw new Error("private matter repository must not be accessed");
    },
  });
  const { approval } = createDebtValidationHostReviewAndApprovalHandlers({
    allowedOrigin: origin,
    repository: repository as unknown as DebtValidationMatterRepository,
  }, async () => ({ user: { id: 12345 as unknown as string } }));
  const response = await approval(new Request(origin + "/api/debt-validation/approval", {
    method: "POST",
    headers: { origin, "content-type": "application/json", authorization: "Bearer synthetic" },
    body: JSON.stringify({ matterId: "synthetic-matter" }),
  }));
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { code: "authentication_required" });
  assert.equal(repositoryCalls, 0);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("host checkout rejects malformed verified identity before matter access or provider callbacks", async () => {
  let repositoryCalls = 0;
  let providerCalls = 0;
  const repository = new Proxy({}, {
    get() {
      repositoryCalls++;
      throw new Error("private matter repository must not be accessed");
    },
  });
  const handler = createDebtValidationHostCheckoutHandler({
    allowedOrigin: origin,
    repository: repository as unknown as DebtValidationMatterRepository,
    submitNewClaim: async () => {
      providerCalls++;
      throw new Error("provider must not be invoked");
    },
    reconcileClaim: async () => {
      providerCalls++;
      throw new Error("provider must not be invoked");
    },
  }, async () => ({ user: { id: 12345 as unknown as string } }));
  const response = await handler(new Request(origin + "/api/debt-validation/checkout", {
    method: "POST",
    headers: { origin, "content-type": "application/json", authorization: "Bearer synthetic" },
    body: JSON.stringify({ matterId: "synthetic-matter" }),
  }));
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { code: "authentication_required" });
  assert.equal(repositoryCalls, 0);
  assert.equal(providerCalls, 0);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("host packet review rejects malformed verified identity before reading a private matter", async () => {
  let repositoryCalls = 0;
  const repository = new Proxy({}, {
    get() {
      repositoryCalls++;
      throw new Error("private matter repository must not be accessed");
    },
  });
  const { review } = createDebtValidationHostReviewAndApprovalHandlers({
    allowedOrigin: origin,
    repository: repository as unknown as DebtValidationMatterRepository,
  }, async () => ({ user: { id: 12345 as unknown as string } }));
  const response = await review(new Request(origin + "/api/debt-validation/review?matterId=synthetic-matter", {
    method: "GET",
    headers: { origin, authorization: "Bearer synthetic" },
  }));
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { code: "authentication_required" });
  assert.equal(repositoryCalls, 0);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("host checkout rejects identity-provider outages before private matter or provider access", async () => {
  let repositoryCalls = 0;
  let providerCalls = 0;
  const repository = new Proxy({}, {
    get() {
      repositoryCalls++;
      throw new Error("private matter repository must not be accessed");
    },
  });
  const handler = createDebtValidationHostCheckoutHandler({
    allowedOrigin: origin,
    repository: repository as unknown as DebtValidationMatterRepository,
    submitNewClaim: async () => {
      providerCalls++;
      throw new Error("provider must not be invoked");
    },
    reconcileClaim: async () => {
      providerCalls++;
      throw new Error("provider must not be invoked");
    },
  }, async () => {
    throw new Error("identity provider temporarily unavailable");
  });
  const response = await handler(new Request(origin + "/api/debt-validation/checkout", {
    method: "POST",
    headers: { origin, "content-type": "application/json", authorization: "Bearer synthetic" },
    body: JSON.stringify({ matterId: "synthetic-matter" }),
  }));
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { code: "authentication_required" });
  assert.equal(repositoryCalls, 0);
  assert.equal(providerCalls, 0);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("host packet review rejects identity-provider outages without reading private PDF storage", async () => {
  let repositoryCalls = 0;
  const repository = new Proxy({}, {
    get() {
      repositoryCalls++;
      throw new Error("private matter repository must not be accessed");
    },
  });
  const { review } = createDebtValidationHostReviewAndApprovalHandlers({
    allowedOrigin: origin,
    repository: repository as unknown as DebtValidationMatterRepository,
  }, async () => {
    throw new Error("identity provider temporarily unavailable");
  });
  const response = await review(new Request(origin + "/api/debt-validation/review?matterId=synthetic-matter", {
    method: "GET",
    headers: { origin, authorization: "Bearer synthetic" },
  }));
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { code: "authentication_required" });
  assert.equal(repositoryCalls, 0);
  assert.equal(response.headers.get("cache-control"), "no-store");
});
