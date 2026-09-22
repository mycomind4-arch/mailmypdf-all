import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  WORKFLOW_EXECUTION_REGISTRY,
  WORKFLOW_EXECUTION_REGISTRY_COUNT,
  isWorkflowExecutable,
  workflowExecutionRecord,
} from "../src/workflow-execution-registry.js";

describe("WORKFLOW_EXECUTION_REGISTRY", () => {
  test("covers exactly 15 sections and 437 navigation workflows", () => {
    const sections = new Set(WORKFLOW_EXECUTION_REGISTRY.map((r) => r.sectionId));
    assert.equal(sections.size, 15);
    assert.equal(WORKFLOW_EXECUTION_REGISTRY_COUNT, 437);
    assert.equal(WORKFLOW_EXECUTION_REGISTRY.length, 437);
  });

  test("every record resolves uniquely by (sectionId, workflowId)", () => {
    const keys = new Set(WORKFLOW_EXECUTION_REGISTRY.map((r) => `${r.sectionId}:${r.workflowId}`));
    assert.equal(keys.size, WORKFLOW_EXECUTION_REGISTRY.length);
    for (const record of WORKFLOW_EXECUTION_REGISTRY) {
      assert.equal(workflowExecutionRecord(record.sectionId, record.workflowId), record);
    }
  });

  test("no execution record points into apps/verticals/**", () => {
    for (const record of WORKFLOW_EXECUTION_REGISTRY) {
      assert.ok(!record.topLevelPath.includes("apps/verticals"));
      assert.ok(record.topLevelPath.startsWith(`${record.sectionId}/workflows/`));
      if (record.executionHref) {
        assert.ok(!record.executionHref.includes("apps/verticals"));
      }
    }
  });

  test("every executable record has a non-null execution href, and every non-connected record has none", () => {
    for (const record of WORKFLOW_EXECUTION_REGISTRY) {
      if (record.executionStatus === "executable") {
        assert.ok(record.executionHref);
      } else {
        assert.equal(record.executionHref, null);
      }
    }
  });

  test("scaffolds remain non-executable: most of the 437 are not-connected today", () => {
    const executable = WORKFLOW_EXECUTION_REGISTRY.filter((r) => r.executionStatus === "executable");
    const notConnected = WORKFLOW_EXECUTION_REGISTRY.filter((r) => r.executionStatus === "not-connected");
    assert.equal(executable.length + notConnected.length, WORKFLOW_EXECUTION_REGISTRY.length);
    assert.equal(executable.length, 26);
    assert.ok(notConnected.length > executable.length);
  });

  test("isWorkflowExecutable matches the record's own status, and is false for unknown workflows", () => {
    const known = WORKFLOW_EXECUTION_REGISTRY.find((r) => r.executionStatus === "executable")!;
    assert.equal(isWorkflowExecutable(known.sectionId, known.workflowId), true);
    assert.equal(isWorkflowExecutable("appeal-mail", "definitely-not-a-real-workflow"), false);
  });

  test("known currently-wired workflows are correctly marked executable", () => {
    for (const [sectionId, workflowId] of [
      ["appeal-mail", "appeal-ssdi-denial"],
      ["appeal-mail", "appeal-ssi-denial"],
      ["notice-respond", "cp2000-response"],
      ["notice-respond", "cp504-response"],
      ["notice-respond", "irs-balance-due-notice-response"],
      ["notice-respond", "irs-penalty-notice-response"],
      ["records-request", "agency-records-request"],
      ["immigration-mail", "immigration-filing-cover-letter"],
      ["secured-transactions", "secured-transaction-eligibility"],
      ["secured-transactions", "name-capacity-resolution"],
      ["secured-transactions", "obligation-value"],
    ] as const) {
      assert.equal(isWorkflowExecutable(sectionId, workflowId), true, `${sectionId}/${workflowId}`);
    }
  });

  test("a known scaffold-only workflow is not executable", () => {
    assert.equal(isWorkflowExecutable("appeal-mail", "appeal-edd-disqualification"), false);
    assert.equal(isWorkflowExecutable("secured-transactions", "ucc1-preparation-authorization"), false);
  });
});
