import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  assessLifecycleActionReadiness,
  buildMonitoringSchedule,
} from "../src/lifecycle/index.js";

const source = {
  id: "source",
  kind: "document" as const,
  label: "Synthetic source",
};

describe("lifecycle readiness and monitoring", () => {
  test("never submits a lifecycle action", () => {
    const result = assessLifecycleActionReadiness({
      request: {
        action: "continuation",
        filingRecordId: "record-1",
        jurisdiction: "TEST-1",
        requestedAt: "2026-09-17T22:00:00Z",
        fields: { filingNumber: "TEST-1" },
        authorization: { status: "supported", sourceRefs: [source] },
      },
      rule: {
        status: "resolved",
        jurisdiction: "TEST-1",
        ruleId: "synthetic-lifecycle",
        value: {
          action: "continuation",
          requiredFields: ["filingNumber"],
        },
        authorityRefs: [{
          id: "authority",
          title: "Synthetic authority",
          jurisdiction: "TEST-1",
        }],
        reasonCodes: [],
        requiresHumanReview: false,
      },
    });

    assert.equal(result.status, "ready-for-review");
    assert.equal(result.canSubmit, false);
    assert.equal(result.requiresHumanReview, true);
  });

  test("monitoring schedule sorts explicit sourced dates without inventing deadlines", () => {
    const schedule = buildMonitoringSchedule([
      {
        id: "later",
        kind: "review-date",
        dueAt: "2027-01-01T00:00:00Z",
        sourceRefs: [source],
      },
      {
        id: "earlier",
        kind: "source-refresh",
        dueAt: "2026-12-01T00:00:00Z",
        sourceRefs: [source],
      },
    ]);
    assert.deepEqual(schedule.events.map((event) => event.id), ["earlier", "later"]);
  });
});
