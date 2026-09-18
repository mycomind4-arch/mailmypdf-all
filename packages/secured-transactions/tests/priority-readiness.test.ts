import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  assessPriorityAnalysisReadiness,
  buildCompetingInterestMatrix,
} from "../src/priority/index.js";

const source = {
  id: "filing-source",
  kind: "filing" as const,
  label: "Synthetic filing record",
};

describe("priority analysis readiness", () => {
  test("does not rank interests when no supported priority rule exists", () => {
    const matrix = buildCompetingInterestMatrix([{
      id: "interest-1",
      claimantEntityId: "claimant-1",
      interestKind: "synthetic-interest",
      jurisdiction: "TEST-1",
      sourceRefs: [source],
      eventDate: "2026-01-01",
    }]);
    const result = assessPriorityAnalysisReadiness({
      matrix,
      rule: {
        status: "unsupported",
        jurisdiction: "TEST-1",
        authorityRefs: [],
        reasonCodes: ["no-active-supported-rule-pack"],
        requiresHumanReview: false,
      },
    });
    assert.equal(result.status, "unsupported");
    assert.equal(result.priorityDetermined, false);
  });

  test("blocks records missing fields required by the resolved rule pack", () => {
    const matrix = buildCompetingInterestMatrix([{
      id: "interest-1",
      claimantEntityId: "claimant-1",
      interestKind: "synthetic-interest",
      jurisdiction: "TEST-1",
      sourceRefs: [source],
    }]);
    const result = assessPriorityAnalysisReadiness({
      matrix,
      rule: {
        status: "resolved",
        jurisdiction: "TEST-1",
        ruleId: "synthetic-priority",
        value: {
          ruleDescription: "Synthetic rule",
          requiredRecordFields: ["eventDate"],
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
    assert.equal(result.status, "blocked");
    assert.deepEqual(result.missingFieldsByRecord["interest-1"], ["eventDate"]);
  });

  test("complete evidence can become ready for rule analysis without determining priority", () => {
    const matrix = buildCompetingInterestMatrix([{
      id: "interest-1",
      claimantEntityId: "claimant-1",
      interestKind: "synthetic-interest",
      jurisdiction: "TEST-1",
      sourceRefs: [source],
      eventDate: "2026-01-01",
    }]);
    const result = assessPriorityAnalysisReadiness({
      matrix,
      rule: {
        status: "resolved",
        jurisdiction: "TEST-1",
        ruleId: "synthetic-priority",
        value: {
          ruleDescription: "Synthetic rule",
          requiredRecordFields: ["eventDate"],
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
    assert.equal(result.status, "ready-for-rule-analysis");
    assert.equal(result.priorityDetermined, false);
  });
});
