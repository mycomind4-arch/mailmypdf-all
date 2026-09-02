import assert from "node:assert/strict";
import test from "node:test";
import {
  approveWorkflowBuild,
  beginWorkflowBuild,
  canDispatchWorkflowBuild,
  createWorkflowBuildRun,
  hashWorkflowBuildSpec,
  recordWorkflowBuildUsage,
  validateWorkflowBuildSpec,
  type WorkflowBuildSpec,
} from "./workflow-build.ts";

const spec: WorkflowBuildSpec = {
  schemaVersion: 1,
  target: {
    verticalId: "notice-respond",
    repository: "mycomind4-arch/notice-respond",
    route: "/workflows/irs-cp504-response",
  },
  workflow: {
    id: "irs-cp504-response",
    title: "IRS CP504 response",
    primaryInput: "document",
  },
  sources: [{ title: "IRS CP504 notice", publisher: "IRS", url: "https://www.irs.gov/" }],
  acceptanceTests: ["rejects a missing notice date"],
  budget: { maxCostUsd: 20, maxAgentTokens: 100_000 },
};

test("workflow specs are canonicalized before approval", async () => {
  const reordered = { ...spec, target: { ...spec.target, route: spec.target.route } };
  assert.equal(await hashWorkflowBuildSpec(spec), await hashWorkflowBuildSpec(reordered));
});

test("workflow build dispatch requires approval for the exact current spec", async () => {
  const run = await createWorkflowBuildRun("run-1", spec);
  assert.equal(canDispatchWorkflowBuild(run).allowed, false);
  assert.throws(() => approveWorkflowBuild(run, {
    action: "BUILD",
    approvedBy: "operator-1",
    approvedAt: "2026-09-02T00:00:00.000Z",
    specHash: "wrong",
  }));

  const approved = approveWorkflowBuild(run, {
    action: "BUILD",
    approvedBy: "operator-1",
    approvedAt: "2026-09-02T00:00:00.000Z",
    specHash: run.specHash,
  });
  assert.equal(beginWorkflowBuild(approved).status, "BUILDING");
});

test("unknown or over-budget usage pauses a workflow build", async () => {
  const run = await createWorkflowBuildRun("run-2", spec);
  const approved = approveWorkflowBuild(run, {
    action: "BUILD",
    approvedBy: "operator-1",
    approvedAt: "2026-09-02T00:00:00.000Z",
    specHash: run.specHash,
  });
  const building = beginWorkflowBuild(approved);
  assert.equal(recordWorkflowBuildUsage(building, { costUsd: null, agentTokens: 1 }).status, "PAUSED_FOR_BUDGET");
  assert.equal(recordWorkflowBuildUsage(building, { costUsd: 21, agentTokens: 1 }).status, "PAUSED_FOR_BUDGET");
});

test("workflow specs require primary sources, acceptance tests, and a positive budget", () => {
  const invalid = { ...spec, sources: [], acceptanceTests: [], budget: { maxCostUsd: 0, maxAgentTokens: 0 } };
  assert.deepEqual(validateWorkflowBuildSpec(invalid), [
    "at least one primary source is required",
    "at least one acceptance test is required",
    "budget.maxCostUsd must be positive",
    "budget.maxAgentTokens must be a positive integer",
  ]);
});
