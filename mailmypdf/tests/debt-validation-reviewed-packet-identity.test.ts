import assert from "node:assert/strict";
import test from "node:test";
import {
  createDebtValidationApprovalHttpHandler,
  createDebtValidationCheckoutHttpHandler,
} from "../src/lib/secure-core/debt-validation-approval-http.server";
import type { DebtValidationMatterRepository } from "../../dispute-mail/workflows/debt-validation/server-matter-approval";

// Isolated boundary regression: no hosted database, provider, payment or mail.
const origin = "https://mailmypdf.example";
const digest = "a".repeat(64);
const manifest = "b".repeat(64);
const reviewed = {
  matterId: "synthetic-matter",
  reviewedPdfSha256: digest,
  reviewedTotalCents: 1499,
  reviewedMailClass: "certified",
  reviewedMatterVersion: 2,
  reviewedEnclosureManifestSha256: manifest,
};
const post = (route: string, body: Record<string, unknown>) =>
  new Request(origin + route, {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });

test("approval rejects missing or changed reviewed packet revision and enclosure manifest before consent", async () => {
  let reads = 0;
  let persisted = 0;
  let pdfReads = 0;
  const repository = {
    loadCurrent: async () => {
      reads++;
      return {
        currentIntake: {}, trustedNotice: {},
        packet: { matterVersion: 2, enclosureManifestSha256: manifest,
          totalCents: 1499, mailClass: "certified" },
      };
    },
    loadPacketPdfBytes: async () => { pdfReads++; return null; },
    persistApproval: async () => { persisted++; },
  } as unknown as DebtValidationMatterRepository;
  const handler = createDebtValidationApprovalHttpHandler({
    allowedOrigin: origin, repository,
    authenticate: async () => ({ id: "synthetic-owner" }),
  });
  const base = { ...reviewed, userApprovedExactPacket: true };
  for (const invalid of [
    { ...base, reviewedMatterVersion: undefined },
    { ...base, reviewedEnclosureManifestSha256: undefined },
  ]) {
    const response = await handler(post("/api/debt-validation/approval", invalid));
    assert.equal(response.status, 400, "review identity is required");
  }
  assert.equal(reads, 0, "incomplete review cannot read owner-scoped state");
  for (const changed of [
    { ...base, reviewedMatterVersion: 3 },
    { ...base, reviewedEnclosureManifestSha256: "c".repeat(64) },
  ]) {
    const response = await handler(post("/api/debt-validation/approval", changed));
    assert.equal(response.status, 409);
    assert.equal((await response.json()).code, "debt_validation_reviewed_packet_identity_mismatch");
  }
  assert.equal(reads, 2);
  assert.equal(pdfReads, 0, "changed review identity rejects before PDF reads");
  assert.equal(persisted, 0, "changed review identity never records approval");
});

test("checkout rejects missing or changed reviewed packet identity before any order or provider call", async () => {
  let reads = 0;
  let submissions = 0;
  let reconciliations = 0;
  const repository = {
    loadApproval: async () => {
      reads++;
      return {
        pdfSha256: digest, totalCents: 1499, mailClass: "certified",
        matterVersion: 2, enclosureManifestSha256: manifest,
      };
    },
  } as unknown as DebtValidationMatterRepository;
  const handler = createDebtValidationCheckoutHttpHandler({
    allowedOrigin: origin, repository,
    authenticate: async () => ({ id: "synthetic-owner" }),
    submitNewClaim: async () => { submissions++; return "pending" as const; },
    reconcileClaim: async () => { reconciliations++; return "pending" as const; },
  });
  const base = { ...reviewed, userConfirmedCheckout: true };
  for (const invalid of [
    { ...base, reviewedMatterVersion: undefined },
    { ...base, reviewedEnclosureManifestSha256: undefined },
  ]) {
    const response = await handler(post("/api/debt-validation/checkout", invalid));
    assert.equal(response.status, 400);
  }
  assert.equal(reads, 0);
  for (const changed of [
    { ...base, reviewedMatterVersion: 3 },
    { ...base, reviewedEnclosureManifestSha256: "c".repeat(64) },
  ]) {
    const response = await handler(post("/api/debt-validation/checkout", changed));
    assert.equal(response.status, 409);
    assert.equal((await response.json()).code, "debt_validation_approval_or_quote_changed");
  }
  assert.equal(reads, 2);
  assert.equal(submissions, 0);
  assert.equal(reconciliations, 0);
});
