import assert from "node:assert/strict";
import test from "node:test";
import {
  createDebtValidationApprovalHttpHandler,
  createDebtValidationCheckoutHttpHandler,
} from "../src/lib/secure-core/debt-validation-approval-http.server";
import type { DebtValidationMatterRepository } from "../../dispute-mail/workflows/debt-validation/server-matter-approval";

const origin = "https://mailmypdf.example";

test("same-site sibling-origin metadata cannot approve a packet or reach checkout providers", async () => {
  let authCalls = 0;
  let repositoryCalls = 0;
  let providerCalls = 0;
  const repository = new Proxy({}, {
    get() {
      repositoryCalls++;
      throw new Error("private matter access forbidden");
    },
  }) as DebtValidationMatterRepository;
  const deps = {
    allowedOrigin: origin,
    repository,
    authenticate: async () => {
      authCalls++;
      return { id: "synthetic-owner" };
    },
  };
  const cases = [
    { path: "/api/debt-validation/approval", handler: createDebtValidationApprovalHttpHandler(deps) },
    {
      path: "/api/debt-validation/checkout",
      handler: createDebtValidationCheckoutHttpHandler({
        ...deps,
        submitNewClaim: async () => {
          providerCalls++;
          throw new Error("provider submission forbidden");
        },
        reconcileClaim: async () => {
          providerCalls++;
          throw new Error("provider reconciliation forbidden");
        },
      }),
    },
  ];

  for (const { path, handler } of cases) {
    const response = await handler(new Request(origin + path, {
      method: "POST",
      headers: {
        origin,
        "sec-fetch-site": "same-site",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        matterId: "synthetic-matter",
        userApprovedExactPacket: true,
        userConfirmedCheckout: true,
      }),
    }));
    assert.equal(response.status, 403, path);
    assert.deepEqual(await response.json(), { code: "origin_not_allowed" });
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
  assert.equal(authCalls, 0);
  assert.equal(repositoryCalls, 0);
  assert.equal(providerCalls, 0);
});
