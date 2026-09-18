import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { assessPriorityRemediationReadiness } from "../rules/remediation-readiness";
import workflowManifest from "../manifest";
import workflowRuntimeClient from "../start/runtime-client";

describe("Priority Remediation workflow", () => {
  test("does not invent a corrective action when authority is absent", () => {
    const result = assessPriorityRemediationReadiness({
      issues: [{
        id: "issue-1",
        code: "example",
        description: "Example issue",
        sourceRefs: [{
          id: "source",
          kind: "filing",
          label: "Example source",
        }],
        severity: "blocking",
      }],
      candidates: [],
    });
    assert.equal(result.status, "blocked");
    assert.equal(result.canExecute, false);
  });

  test("workflow remains non-executable", () => {
    assert.equal(workflowManifest.manifest.allowsConsequentialAction, false);
    assert.equal(workflowRuntimeClient.executable, false);
  });
});
