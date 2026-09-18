import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  assessPriorityRemediationReadiness,
} from "../src/priority/index.js";

const source = {
  id: "defect-source",
  kind: "filing" as const,
  label: "Synthetic defect source",
};

const authority = {
  id: "authority",
  title: "Synthetic remediation authority",
  jurisdiction: "TEST-1",
  sourceUri: "test://authority",
};

describe("priority remediation readiness", () => {
  test("blocks unsourced remediation issues", () => {
    const result = assessPriorityRemediationReadiness({
      issues: [{
        id: "issue-1",
        code: "synthetic-defect",
        description: "Synthetic defect",
        sourceRefs: [],
        severity: "blocking",
      }],
      candidates: [],
    });
    assert.equal(result.status, "human-review-required");
    assert.equal(result.canExecute, false);
  });

  test("blocks an issue with no authority-linked remediation candidate", () => {
    const result = assessPriorityRemediationReadiness({
      issues: [{
        id: "issue-1",
        code: "synthetic-defect",
        description: "Synthetic defect",
        sourceRefs: [source],
        severity: "blocking",
      }],
      candidates: [],
    });
    assert.equal(result.status, "blocked");
    assert.deepEqual(result.uncoveredIssueIds, ["issue-1"]);
  });

  test("authority-linked candidates become review-ready but never executable", () => {
    const result = assessPriorityRemediationReadiness({
      issues: [{
        id: "issue-1",
        code: "synthetic-defect",
        description: "Synthetic defect",
        sourceRefs: [source],
        severity: "blocking",
      }],
      candidates: [{
        id: "candidate-1",
        issueId: "issue-1",
        actionCode: "synthetic-correction",
        description: "Synthetic corrective action for testing",
        authorityRefs: [authority],
      }],
    });
    assert.equal(result.status, "ready-for-review");
    assert.equal(result.requiresHumanReview, true);
    assert.equal(result.canExecute, false);
    assert.equal(result.cureDetermined, false);
  });
});
