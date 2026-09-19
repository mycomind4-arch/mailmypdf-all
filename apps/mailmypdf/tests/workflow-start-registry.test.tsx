import assert from "node:assert/strict";
import test from "node:test";
import { workflowStartComponent } from "../src/lib/workflow-start-registry";
import { WORKFLOW_EXECUTION_REGISTRY, workflowExecutionRecord } from "@mailmypdf/workflows";
import Cp2000ResponseStart from "@mailmypdf/notice-respond/workflows/cp2000-response/start";
import Cp14ResponseStart from "@mailmypdf/notice-respond/workflows/cp14-response/start";

// Proves the generic /dashboard/workflows/$sectionId/$workflowId/start bridge
// actually resolves to the real top-level new-architecture start component,
// not a stub -- this repo has no DOM/render test harness in apps/mailmypdf
// (no vitest/testing-library), so this proves wiring by reference identity
// against the real component export rather than a full JSX render; building
// a DOM render harness is out of scope for this bridge task.

test("the start bridge resolves cp2000-response to its real top-level start component", () => {
  const record = workflowExecutionRecord("notice-respond", "cp2000-response");
  assert.equal(record?.executionStatus, "executable");
  const Component = workflowStartComponent("notice-respond", "cp2000-response");
  assert.equal(Component, Cp2000ResponseStart);
  assert.equal(typeof Component, "function");
});

test("the start bridge resolves the reconciled cp14-response identity to its real top-level start component", () => {
  const record = workflowExecutionRecord("notice-respond", "cp14-response");
  assert.equal(record?.executionStatus, "executable");
  const Component = workflowStartComponent("notice-respond", "cp14-response");
  assert.equal(Component, Cp14ResponseStart);
  assert.equal(typeof Component, "function");
});

test("a not-connected workflow has no renderer wired, matching the execution registry", () => {
  const record = workflowExecutionRecord("appeal-mail", "appeal-edd-disqualification");
  assert.equal(record?.executionStatus, "not-connected");
  assert.equal(workflowStartComponent("appeal-mail", "appeal-edd-disqualification"), undefined);
});

test("every executable registry record has a real, defined renderer wired", () => {
  const executable = WORKFLOW_EXECUTION_REGISTRY.filter((r) => r.executionStatus === "executable");
  assert.ok(executable.length > 0);
  for (const record of executable) {
    assert.ok(
      workflowStartComponent(record.sectionId, record.workflowId),
      `missing renderer for executable workflow ${record.sectionId}/${record.workflowId}`,
    );
  }
});
