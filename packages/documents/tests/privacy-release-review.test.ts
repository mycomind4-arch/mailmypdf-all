import assert from "node:assert/strict";
import test from "node:test";

import {
  approvedRedactionInstructions,
  assertPrivacyReleaseApproved,
  createPrivacyReleaseReview,
  privacyReleaseStatus,
  renderApprovedRedactions,
} from "../src/privacy/privacy-release-review.js";

const base = {
  documentId: "doc-1",
  documentSha256: "a".repeat(64),
  reviewerId: "owner-1",
  reviewedAt: "2026-09-18T00:00:00.000Z",
};

test("privacy release fails closed when a finding has no decision", () => {
  const review = createPrivacyReleaseReview({
    ...base,
    findings: [{ id: "ssn-1", kind: "social_security_number", confidence: 0.99 }],
    decisions: [],
  });
  assert.equal(privacyReleaseStatus(review), "blocked");
  assert.throws(() => assertPrivacyReleaseApproved(review), /unresolved sensitive finding/);
});

test("redaction decisions require an actionable location", () => {
  assert.throws(
    () =>
      createPrivacyReleaseReview({
        ...base,
        findings: [{ id: "ssn-1", kind: "social_security_number", confidence: 0.99 }],
        decisions: [{ findingId: "ssn-1", action: "redact" }],
      }),
    /without a location/,
  );
});

test("explicit retain decisions allow release", () => {
  const review = createPrivacyReleaseReview({
    ...base,
    findings: [{ id: "email-1", kind: "email", confidence: 0.95 }],
    decisions: [{ findingId: "email-1", action: "retain", reason: "Required recipient contact information" }],
  });
  assert.equal(privacyReleaseStatus(review), "approved");
  assert.doesNotThrow(() => assertPrivacyReleaseApproved(review));
});

test("approved redactions produce renderer instructions and require changed bytes/hash", async () => {
  const review = createPrivacyReleaseReview({
    ...base,
    findings: [{
      id: "ssn-1",
      kind: "social_security_number",
      confidence: 0.99,
      location: { type: "pdf_rect", page: 1, x: 10, y: 20, width: 50, height: 12 },
    }],
    decisions: [{ findingId: "ssn-1", action: "redact" }],
  });

  assert.equal(privacyReleaseStatus(review), "redaction_required");
  assert.equal(approvedRedactionInstructions(review).length, 1);

  const output = await renderApprovedRedactions({
    review,
    sourceBytes: new Uint8Array([1, 2, 3]),
    renderer: {
      async render() {
        return { bytes: new Uint8Array([9, 9, 9]), sha256: "b".repeat(64) };
      },
    },
  });
  assert.equal(output.sha256, "b".repeat(64));

  await assert.rejects(
    () =>
      renderApprovedRedactions({
        review,
        sourceBytes: new Uint8Array([1, 2, 3]),
        renderer: {
          async render() {
            return { bytes: new Uint8Array([1, 2, 3]), sha256: "a".repeat(64) };
          },
        },
      }),
    /original document hash/,
  );
});
