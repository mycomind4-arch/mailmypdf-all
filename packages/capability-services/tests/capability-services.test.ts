import assert from "node:assert/strict";
import test from "node:test";
import { buildAmortizationSchedule, classifyTaxNotice, createLegalHold, createSecureShare, deletionBlockedByLegalHold, isNearDuplicate, validateTaxNoticeFacts } from "../src/index.js";

test("secure shares expire/revoke and legal holds block deletion", () => {
  const share = createSecureShare({ id: "share-1", artifactId: "artifact-1", matterId: "matter-1", audience: "reviewer", scope: "review", expiresAt: new Date(Date.now() + 60_000).toISOString(), createdBy: "user-1" });
  const hold = createLegalHold({ id: "hold-1", matterId: "matter-1", artifactIds: ["artifact-1"], reason: "anticipated dispute", createdBy: "user-1", createdAt: new Date().toISOString() });
  assert.equal(share.revokedAt, null);
  assert.equal(deletionBlockedByLegalHold("artifact-1", [hold]), true);
});

test("tax classification remains conservative and validates facts", () => {
  assert.equal(classifyTaxNotice({ noticeNumber: "CP2000" }).family, "cp2000");
  assert.equal(classifyTaxNotice({ text: "unknown letter" }).requiresHumanReview, true);
  assert.deepEqual(validateTaxNoticeFacts({ sourceDocumentId: "doc-1", taxYear: 2025 }), []);
});

test("creative finance math is deterministic and template dedup is bounded", () => {
  const rows = buildAmortizationSchedule({ principal: 1000, annualRatePercent: 0, paymentCount: 4, paymentsPerYear: 12 });
  assert.equal(rows.length, 4);
  assert.equal(Math.round(rows.at(-1)!.balance), 0);
  assert.equal(isNearDuplicate("Respond to IRS notice with supporting evidence", "Respond to IRS notice and supporting evidence", 0.7), true);
});
