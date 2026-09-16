import assert from "node:assert/strict";
import test from "node:test";
import { CapabilityRuntime } from "../src/capability-runtime.js";
import { defineWorkflowFromBlueprint } from "../src/workflow-blueprints.js";
import {
  runManifestWorkflow,
  type ManifestCapabilityExecution,
} from "../src/manifest-runner.js";

function fixture() {
  return defineWorkflowFromBlueprint({
    id: "manifest-runner-fixture",
    vertical: "fixture",
    title: "Manifest Runner Fixture",
    route: "/fixture/manifest-runner",
    archetype: "simple-mail",
    adapters: ["business"],
    commerce: "none",
  });
}

function passingRuntime(
  workflow = fixture(),
  overrides: Partial<Record<string, "passed" | "warning" | "blocked" | "failed">> = {},
  calls: string[] = [],
) {
  const runtime = new CapabilityRuntime();
  const capabilities = new Set(
    workflow.plan.steps.flatMap((step) => [...step.capabilities]),
  );

  for (const capability of capabilities) {
    runtime.register({
      id: capability,
      async execute(context) {
        calls.push(capability);
        assert.equal(context.workflowId, workflow.manifest.id);
        return {
          capability,
          status: overrides[capability] ?? "passed",
          output: { capability },
          messages:
            overrides[capability] && overrides[capability] !== "passed"
              ? [`${capability} needs attention`]
              : [],
        };
      },
    });
  }
  return runtime;
}

function allGateApprovals(workflow = fixture()) {
  return (workflow.manifest.gates ?? [])
    .filter((gate) => gate.required)
    .map((gate) => gate.id);
}

test("manifest runner executes dynamic steps in manifest order", async () => {
  const workflow = fixture();
  const calls: string[] = [];
  const runtime = passingRuntime(workflow, {}, calls);

  const result = await runManifestWorkflow({
    workflow,
    runtime,
    matterId: "matter-1",
    actorId: "user-1",
    scopes: ["ai:execute"],
    approvals: allGateApprovals(workflow),
    rootInput: { example: true },
  });

  assert.equal(result.status, "completed");
  assert.deepEqual(
    calls,
    workflow.plan.steps.flatMap((step) => [...step.capabilities]),
  );
  assert.deepEqual(
    result.completedStepIds,
    workflow.plan.steps.map((step) => step.step.id),
  );
});

test("manifest runner fails closed on a warning", async () => {
  const workflow = fixture();
  const first = workflow.plan.steps[0]!.capabilities[0]!;
  const calls: string[] = [];
  const runtime = passingRuntime(workflow, { [first]: "warning" }, calls);

  const result = await runManifestWorkflow({
    workflow,
    runtime,
    matterId: "matter-1",
    actorId: "user-1",
    scopes: [],
    approvals: allGateApprovals(workflow),
    rootInput: {},
  });

  assert.equal(result.status, "blocked");
  assert.deepEqual(result.stoppedAt, {
    stepId: workflow.plan.steps[0]!.step.id,
    capability: first,
  });
  assert.equal(calls.length, 1);
});

test("manifest runner preserves explicit consequential gates", async () => {
  const workflow = fixture();
  const runtime = passingRuntime(workflow);

  const result = await runManifestWorkflow({
    workflow,
    runtime,
    matterId: "matter-1",
    actorId: "user-1",
    scopes: [],
    approvals: [],
    rootInput: {},
  });

  assert.equal(result.status, "blocked");
  assert.ok(result.stoppedAt);
  assert.ok(
    ["approval", "mailing", "payment"].includes(
      result.stoppedAt!.capability,
    ),
  );
});

test("manifest runner resumes only exact passed step-capability executions", async () => {
  const workflow = fixture();
  const firstStep = workflow.plan.steps[0]!;
  const firstCapability = firstStep.capabilities[0]!;
  const resume: ManifestCapabilityExecution[] = [
    {
      stepId: firstStep.step.id,
      capability: firstCapability,
      reused: false,
      result: {
        capability: firstCapability,
        status: "passed",
        output: { restored: true },
        messages: [],
      },
    },
  ];

  const calls: string[] = [];
  const runtime = passingRuntime(workflow, {}, calls);
  const result = await runManifestWorkflow({
    workflow,
    runtime,
    matterId: "matter-1",
    actorId: "user-1",
    scopes: [],
    approvals: allGateApprovals(workflow),
    rootInput: {},
    resume,
  });

  assert.equal(result.status, "completed");
  assert.equal(
    calls.filter((capability) => capability === firstCapability).length,
    0,
  );
  assert.equal(result.executions[0]?.reused, true);
});


test("resume state never leaks future capability output into earlier steps", async () => {
  const workflow = fixture();
  const lastStep = workflow.plan.steps.at(-1)!;
  const futureCapability = lastStep.capabilities.at(-1)!;
  let firstSawFuture = false;
  const runtime = new CapabilityRuntime();

  for (const { capabilities } of workflow.plan.steps) {
    for (const capability of capabilities) {
      if (runtime.has(capability)) continue;
      runtime.register({
        id: capability,
        async execute(context) {
          if (capability === workflow.plan.steps[0]!.capabilities[0]!) {
            firstSawFuture = context.prior.has(futureCapability);
          }
          return {
            capability,
            status: "passed",
            output: { capability },
            messages: [],
          };
        },
      });
    }
  }

  const resume: ManifestCapabilityExecution[] = [{
    stepId: lastStep.step.id,
    capability: futureCapability,
    reused: false,
    result: {
      capability: futureCapability,
      status: "passed",
      output: { future: true },
      messages: [],
    },
  }];

  const result = await runManifestWorkflow({
    workflow,
    runtime,
    matterId: "matter-1",
    actorId: "user-1",
    scopes: [],
    approvals: allGateApprovals(workflow),
    rootInput: {},
    resume,
  });

  assert.equal(result.status, "completed");
  assert.equal(firstSawFuture, false);
});
