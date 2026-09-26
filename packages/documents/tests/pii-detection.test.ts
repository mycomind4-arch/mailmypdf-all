import assert from "node:assert/strict";
import test from "node:test";

import { RegexPiiDetector } from "../src/privacy/detection.js";
import { createPrivacyReleaseReview, privacyReleaseStatus } from "../src/privacy/privacy-release-review.js";

test("RegexPiiDetector finds an SSN and an email with correct offsets", async () => {
  const detector = new RegexPiiDetector();
  const text = "Contact 555-12-6789 or alex@example.com for details.";
  const findings = await detector.detect({ documentId: "doc-1", text });

  const ssn = findings.find((finding) => finding.kind === "social_security_number");
  const email = findings.find((finding) => finding.kind === "email");
  assert.ok(ssn);
  assert.ok(email);
  assert.equal(text.slice((ssn!.location as { start: number; end: number }).start, (ssn!.location as { start: number; end: number }).end), "555-12-6789");
  assert.equal(text.slice((email!.location as { start: number; end: number }).start, (email!.location as { start: number; end: number }).end), "alex@example.com");
  assert.equal(ssn!.detector, "regex-reference-detector");
});

test("RegexPiiDetector returns no findings for clean text", async () => {
  const detector = new RegexPiiDetector();
  const findings = await detector.detect({ documentId: "doc-1", text: "This letter contains no sensitive data at all." });
  assert.deepEqual(findings, []);
});

test("detector output feeds directly into the existing privacy release review gate", async () => {
  const detector = new RegexPiiDetector();
  const text = "SSN on file: 555-12-6789.";
  const findings = await detector.detect({ documentId: "doc-1", text });
  assert.equal(findings.length, 1);

  const review = createPrivacyReleaseReview({
    documentId: "doc-1",
    documentSha256: "a".repeat(64),
    findings,
    decisions: [],
    reviewerId: "reviewer-1",
    reviewedAt: "2026-09-26T00:00:00.000Z",
  });

  // Detection alone never authorizes disclosure — a human decision is still required.
  assert.equal(privacyReleaseStatus(review), "blocked");
});
