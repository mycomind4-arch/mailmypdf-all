import assert from "node:assert/strict";
import test from "node:test";
import {
  createDebtValidationApprovalHttpHandler,
  createDebtValidationCheckoutHttpHandler,
} from "../src/lib/secure-core/debt-validation-approval-http.server";
import type { DebtValidationMatterRepository } from "../../dispute-mail/workflows/debt-validation/server-matter-approval";

const origin = "https://mailmypdf.example";
const longMatterId = "m".repeat(201);
const reviewed = {
  matterId: longMatterId,
  reviewedPdfSha256: "a".repeat(64),
  reviewedTotalCents: 2993,
  reviewedMailClass: "certified",
};

test("debt-validation approval rejects oversized matter IDs before reading owner-scoped state", async () => {
  let repositoryReads = 0;
  const repository = {
    loadCurrent: async () => {
      repositoryReads++;
      throw new Error("repository_must_not_be_read");
    },
  } as unknown as DebtValidationMatterRepository;
  const handler = createDebtValidationApprovalHttpHandler({
    allowedOrigin: origin,
    authenticate: async () => ({ id: "synthetic-owner" }),
    repository,
  });
  const response = await handler(new Request(origin + "/api/debt-validation/approval", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify({ ...reviewed, userApprovedExactPacket: true }),
  }));
  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, "invalid_approval_request");
  assert.equal(repositoryReads, 0, "oversized matter IDs cannot reach persistence");
});

test("debt-validation checkout rejects oversized matter IDs before order or provider callbacks", async () => {
  let repositoryReads = 0;
  let providerSubmissions = 0;
  let receiptReads = 0;
  const repository = {
    loadApproval: async () => {
      repositoryReads++;
      throw new Error("repository_must_not_be_read");
    },
  } as unknown as DebtValidationMatterRepository;
  const handler = createDebtValidationCheckoutHttpHandler({
    allowedOrigin: origin,
    authenticate: async () => ({ id: "synthetic-owner" }),
    repository,
    submitNewClaim: async () => {
      providerSubmissions++;
      return "pending" as const;
    },
    reconcileClaim: async () => {
      receiptReads++;
      return "pending" as const;
    },
  });
  const response = await handler(new Request(origin + "/api/debt-validation/checkout", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify({ ...reviewed, userConfirmedCheckout: true }),
  }));
  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, "invalid_checkout_request");
  assert.equal(repositoryReads, 0, "oversized matter IDs cannot reach approval storage");
  assert.equal(providerSubmissions, 0, "invalid IDs cannot submit mocked payment or mailing");
  assert.equal(receiptReads, 0, "invalid IDs cannot reach receipt reconciliation");
});
