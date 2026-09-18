import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  recordPerfectionEvent,
  verifyPerfectionEvidence,
} from "../src/perfection/index.js";

const source = {
  id: "receipt",
  kind: "filing" as const,
  label: "Synthetic receipt",
};

const selection = {
  status: "selected" as const,
  jurisdiction: "TEST-1",
  ruleId: "synthetic-rule",
  selectedMethod: "filing" as const,
  allowedMethods: ["filing" as const],
  requiredConditions: [],
  authorityRefIds: ["authority"],
  reasons: [],
  requiresHumanReview: false,
  legalSufficiencyDetermined: false as const,
};

describe("perfection event and evidence verification", () => {
  test("completed events require evidence", () => {
    assert.throws(() =>
      recordPerfectionEvent({
        eventId: "event-1",
        method: "filing",
        jurisdiction: "TEST-1",
        status: "completed",
        occurredAt: "2026-09-17T21:30:00Z",
      }),
    );
  });

  test("verifies evidence alignment without declaring legal perfection", () => {
    const event = recordPerfectionEvent({
      eventId: "event-1",
      method: "filing",
      jurisdiction: "TEST-1",
      status: "completed",
      occurredAt: "2026-09-17T21:30:00Z",
      sourceRefs: [source],
      externalRecordId: "TEST-RECEIPT-1",
    });
    const result = verifyPerfectionEvidence({ selection, event });
    assert.equal(result.status, "evidence-verified");
    assert.equal(result.perfectionLegallyDetermined, false);
  });

  test("method mismatch requires review", () => {
    const event = recordPerfectionEvent({
      eventId: "event-2",
      method: "control",
      jurisdiction: "TEST-1",
      status: "completed",
      occurredAt: "2026-09-17T21:30:00Z",
      sourceRefs: [source],
    });
    const result = verifyPerfectionEvidence({ selection, event });
    assert.equal(result.status, "human-review-required");
  });
});
