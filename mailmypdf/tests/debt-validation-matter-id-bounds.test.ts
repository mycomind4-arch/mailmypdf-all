import assert from "node:assert/strict";
import test from "node:test";
import {
  createDebtValidationApprovalHttpHandler,
  createDebtValidationCheckoutHttpHandler,
  createDebtValidationPacketReviewHttpHandler,
} from "../src/lib/secure-core/debt-validation-approval-http.server";
import { createDebtValidationIntakeHttpHandler } from "../src/lib/secure-core/debt-validation-intake-http.server";
import type { DebtValidationMatterRepository } from "../../dispute-mail/workflows/debt-validation/server-matter-approval";

const origin = "https://mailmypdf.example";
const longMatterId = "m".repeat(201);
const reviewed = {
  matterId: longMatterId,
  reviewedPdfSha256: "a".repeat(64),
  reviewedTotalCents: 2993,
  reviewedMailClass: "certified",
  reviewedMatterVersion: 2,
  reviewedEnclosureManifestSha256: "b".repeat(64),
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

test("debt-validation approval and checkout enforce actual streamed body size despite understated Content-Length", async (t) => {
  const oversizedPayload = "x".repeat(8193);
  for (const operation of ["approval", "checkout"] as const) {
    await t.test(operation, async () => {
      let repositoryReads = 0;
      let providerSubmissions = 0;
      let receiptReads = 0;
      const repository = {
        loadCurrent: async () => {
          repositoryReads++;
          throw new Error("repository_must_not_be_read");
        },
        loadApproval: async () => {
          repositoryReads++;
          throw new Error("repository_must_not_be_read");
        },
      } as unknown as DebtValidationMatterRepository;
      const common = {
        allowedOrigin: origin,
        authenticate: async () => ({ id: "synthetic-owner" }),
        repository,
      };
      const handler = operation === "approval"
        ? createDebtValidationApprovalHttpHandler(common)
        : createDebtValidationCheckoutHttpHandler({
          ...common,
          submitNewClaim: async () => {
            providerSubmissions++;
            return "pending" as const;
          },
          reconcileClaim: async () => {
            receiptReads++;
            return "pending" as const;
          },
        });
      const body = JSON.stringify({
        ...reviewed,
        matterId: "synthetic-matter",
        ...(operation === "approval"
          ? { userApprovedExactPacket: true }
          : { userConfirmedCheckout: true }),
        // A malicious client can lie about its declared size; the actual
        // stream must be bounded before any owner-scoped read or provider call.
        padding: oversizedPayload,
      });
      const response = await handler(new Request(origin + "/api/debt-validation/" + operation, {
        method: "POST",
        headers: {
          origin,
          "content-type": "application/json",
          "content-length": "1",
        },
        body,
      }));
      assert.equal(response.status, 413);
      assert.equal((await response.json()).code, "body_too_large");
      assert.equal(repositoryReads, 0, "oversized stream cannot read owner-scoped matter data");
      assert.equal(providerSubmissions, 0, "oversized stream cannot submit mocked providers");
      assert.equal(receiptReads, 0, "oversized stream cannot reconcile receipts");
    });
  }
});

test("debt-validation intake enforces streamed body size before trusted notice access", async (t) => {
  let noticeReads = 0;
  let packetWrites = 0;
  const handler = createDebtValidationIntakeHttpHandler({
    allowedOrigin: origin,
    authenticate: async () => ({ id: "synthetic-owner" }),
    loadVerifiedNotice: async () => {
      noticeReads++;
      throw new Error("oversized_body_must_not_read_notice");
    },
    persistPreparedMatter: async () => {
      packetWrites++;
      throw new Error("oversized_body_must_not_persist_packet");
    },
  });
  // Unlike a declared-size-only guard, this must reject the ACTUAL stream
  // even when the client omits or lies about Content-Length. It must do so
  // before touching the owner-scoped notice vault or preparing any PDF.
  for (const declaredLength of [undefined, "1"] as const) {
    await t.test(declaredLength === undefined ? "no declared length" : "understated length", async () => {
      const response = await handler(new Request(origin + "/api/debt-validation/intake", {
        method: "POST",
        headers: {
          origin,
          "content-type": "application/json",
          ...(declaredLength === undefined ? {} : { "content-length": declaredLength }),
        },
        body: JSON.stringify({ padding: "x".repeat(8193) }),
      }));
      assert.equal(response.status, 413);
      assert.equal((await response.json()).code, "body_too_large");
      assert.equal(noticeReads, 0, "rejected intake must not read the controlling notice");
      assert.equal(packetWrites, 0, "rejected intake must not persist a packet");
    });
  }
});

test("debt-validation private PDF review rejects a foreign Origin before authentication or storage", async () => {
  let authenticationCalls = 0;
  let repositoryReads = 0;
  const repository = {
    loadReviewArtifact: async () => {
      repositoryReads++;
      return null;
    },
  } as unknown as DebtValidationMatterRepository;
  const review = createDebtValidationPacketReviewHttpHandler({
    allowedOrigin: origin,
    authenticate: async () => {
      authenticationCalls++;
      return { id: "synthetic-owner" };
    },
    repository,
  });
  const url = origin + "/api/debt-validation/review?matterId=synthetic-matter";
  for (const suppliedOrigin of ["https://attacker.example", "null"]) {
    const denied = await review(new Request(url, {
      headers: { origin: suppliedOrigin },
    }));
    assert.equal(denied.status, 403, suppliedOrigin);
    assert.equal((await denied.json()).code, "origin_not_allowed");
  }
  // A sibling subdomain is "same-site" but not same-origin. Browsers may
  // omit Origin on a GET, so Fetch Metadata must independently reject it.
  // Unknown values must also fail closed before bearer verification/storage.
  for (const fetchSite of ["same-site", "cross-site", "unexpected"]) {
    const denied = await review(new Request(url, {
      headers: { "sec-fetch-site": fetchSite },
    }));
    assert.equal(denied.status, 403, fetchSite);
    assert.equal((await denied.json()).code, "origin_not_allowed");
  }
  assert.equal(authenticationCalls, 0, "foreign Origin or site must not invoke bearer verification");
  assert.equal(repositoryReads, 0, "foreign Origin or site must not read a private PDF");

  // Normal direct navigation has no Origin header. Explicit same-origin
  // navigation and user-initiated Fetch Metadata "none" remain supported.
  for (const headers of [
    {}, { origin }, { "sec-fetch-site": "same-origin" }, { "sec-fetch-site": "none" },
  ]) {
    const allowed = await review(new Request(url, { headers }));
    assert.equal(allowed.status, 404);
  }
  assert.equal(authenticationCalls, 4);
  assert.equal(repositoryReads, 4);
});

test("debt-validation HTTP boundaries reject 129-character IDs before private reads or provider callbacks", async () => {
  // The versioned, unapplied PostgreSQL schema allows at most 128 characters.
  // A 129-character ID previously passed HTTP validation and could reach
  // expensive notice/PDF preparation before the database rejected the insert.
  const atLimit = "m".repeat(128);
  const overLimit = "m".repeat(129);
  let noticeReads = 0;
  let packetWrites = 0;
  let approvalReads = 0;
  let reviewReads = 0;
  let providerCalls = 0;
  const address = "Example Collections\\nPO Box 456\\nAustin, TX 78701";
  const digest = "a".repeat(64);
  const intake = {
    consumerName: "Synthetic Consumer",
    consumerMailingAddress: "123 Example St\\nSacramento, CA 95814",
    collectorName: "Example Collections",
    collectorResponseAddress: address,
    accountReference: "SYNTHETIC-123",
    disputeExplanation: "I dispute the stated balance and request verification.",
    requestOriginalCreditor: true,
    noticeDocumentId: "notice-1",
    noticeSha256: digest,
    noticeVersion: 1,
    noticeResponseAddress: address,
    noticeDate: "2026-10-10",
    noticeDisputeDeadline: null,
    recipientConfirmed: true,
    confirmedRecipientAddress: address,
    confirmedNoticeSha256: digest,
    confirmedNoticeDocumentId: "notice-1",
    confirmedNoticeVersion: 1,
  };
  const repository = {
    loadCurrent: async () => { approvalReads++; return null; },
    loadApproval: async () => { approvalReads++; return null; },
    loadReviewArtifact: async () => { reviewReads++; return null; },
  } as unknown as DebtValidationMatterRepository;
  const authenticate = async () => ({ id: "synthetic-owner" });
  const deps = { allowedOrigin: origin, authenticate, repository };
  const intakeHandler = createDebtValidationIntakeHttpHandler({
    allowedOrigin: origin, authenticate,
    loadVerifiedNotice: async () => { noticeReads++; return null; },
    persistPreparedMatter: async () => {
      packetWrites++;
      throw new Error("unexpected_packet_persistence");
    },
  });
  const approvalHandler = createDebtValidationApprovalHttpHandler(deps);
  const checkoutHandler = createDebtValidationCheckoutHttpHandler({
    ...deps,
    submitNewClaim: async () => { providerCalls++; return "pending" as const; },
    reconcileClaim: async () => { providerCalls++; return "pending" as const; },
  });
  const reviewHandler = createDebtValidationPacketReviewHttpHandler(deps);
  const post = (path: string, body: unknown) => new Request(origin + path, {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const intakeBody = (matterId: string) => ({
    matterId, noticeDocumentId: "notice-1",
    letterDate: "2026-10-30", mailClass: "certified", intake,
  });
  const reviewedBody = (matterId: string) => ({
    ...reviewed, matterId,
  });

  const rejectedIntake = await intakeHandler(post("/api/debt-validation/intake", intakeBody(overLimit)));
  assert.equal(rejectedIntake.status, 400);
  assert.equal((await rejectedIntake.json()).code, "invalid_intake_request");
  const rejectedApproval = await approvalHandler(post("/api/debt-validation/approval", {
    ...reviewedBody(overLimit), userApprovedExactPacket: true,
  }));
  assert.equal(rejectedApproval.status, 400);
  assert.equal((await rejectedApproval.json()).code, "invalid_approval_request");
  const rejectedCheckout = await checkoutHandler(post("/api/debt-validation/checkout", {
    ...reviewedBody(overLimit), userConfirmedCheckout: true,
  }));
  assert.equal(rejectedCheckout.status, 400);
  assert.equal((await rejectedCheckout.json()).code, "invalid_checkout_request");
  const rejectedReview = await reviewHandler(new Request(
    origin + "/api/debt-validation/review?matterId=" + overLimit,
  ));
  assert.equal(rejectedReview.status, 400);
  assert.equal((await rejectedReview.json()).code, "invalid_review_request");
  assert.equal(noticeReads, 0);
  assert.equal(packetWrites, 0);
  assert.equal(approvalReads, 0);
  assert.equal(reviewReads, 0);
  assert.equal(providerCalls, 0);

  // Exactly 128 characters still passes the HTTP size gate and reaches the
  // normal owner-scoped lookup. These stubs return not found, not a packet.
  assert.equal((await intakeHandler(post("/api/debt-validation/intake", intakeBody(atLimit)))).status, 404);
  assert.equal((await approvalHandler(post("/api/debt-validation/approval", {
    ...reviewedBody(atLimit), userApprovedExactPacket: true,
  }))).status, 409);
  assert.equal((await checkoutHandler(post("/api/debt-validation/checkout", {
    ...reviewedBody(atLimit), userConfirmedCheckout: true,
  }))).status, 409);
  assert.equal((await reviewHandler(new Request(
    origin + "/api/debt-validation/review?matterId=" + atLimit,
  ))).status, 404);
  assert.equal(noticeReads, 1);
  assert.equal(approvalReads, 2);
  assert.equal(reviewReads, 1);
  assert.equal(packetWrites, 0);
  assert.equal(providerCalls, 0);
});
