import assert from "node:assert/strict";
import test from "node:test";
import { CapabilityRuntime } from "../src/capability-runtime.js";
import { defineWorkflowFromBlueprint } from "../src/workflow-blueprints.js";
import { runManifestWorkflow } from "../src/manifest-runner.js";

function runtimeFor(flow: ReturnType<typeof defineWorkflowFromBlueprint>, calls: string[]) {
  const runtime = new CapabilityRuntime();
  for (const capability of new Set(flow.plan.steps.flatMap((step) => step.capabilities))) {
    runtime.register({
      id: capability,
      async execute() {
        calls.push(capability);
        return { capability, status: "passed", messages: [] };
      },
    });
  }
  return runtime;
}

test("input condition skips an unnecessary dynamic step", async () => {
  const flow = defineWorkflowFromBlueprint({
    id: "conditional-fixture",
    vertical: "fixture",
    title: "Conditional Fixture",
    route: "/fixture/conditional",
    archetype: "official-response",
    adapters: ["government"],
    commerce: "none",
    stepConditions: {
      evidence: {
        kind: "input_not_equals",
        path: "responseMode",
        value: "agree",
      },
    },
  });
  const calls: string[] = [];

  const result = await runManifestWorkflow({
    workflow: flow,
    runtime: runtimeFor(flow, calls),
    matterId: "m1",
    actorId: "u1",
    scopes: [],
    approvals: (flow.manifest.gates ?? []).map((gate) => gate.id),
    rootInput: { responseMode: "agree" },
  });

  assert.equal(result.status, "completed");
  assert.ok(result.skippedStepIds?.includes("evidence"));
  const evidenceCapability = flow.plan.steps
    .find((step) => step.step.id === "evidence")
    ?.capabilities[0];
  if (evidenceCapability) assert.ok(!calls.includes(evidenceCapability));
});

test("condition can depend on status of an earlier capability", async () => {
  const base = defineWorkflowFromBlueprint({
    id: "status-condition-base",
    vertical: "fixture",
    title: "Status condition",
    route: "/fixture/status-condition",
    archetype: "official-response",
    adapters: ["government"],
    commerce: "none",
  });
  const earlier = base.plan.steps[0]!.capabilities[0]!;
  const flow = defineWorkflowFromBlueprint({
    id: "status-condition",
    vertical: "fixture",
    title: "Status condition",
    route: "/fixture/status-condition",
    archetype: "official-response",
    adapters: ["government"],
    commerce: "none",
    stepConditions: {
      documents: {
        kind: "capability_status",
        capability: earlier,
        status: "passed",
      },
    },
  });

  const result = await runManifestWorkflow({
    workflow: flow,
    runtime: runtimeFor(flow, []),
    matterId: "m1",
    actorId: "u1",
    scopes: [],
    approvals: (flow.manifest.gates ?? []).map((gate) => gate.id),
    rootInput: {},
  });

  assert.equal(result.status, "completed");
  assert.ok(!result.skippedStepIds?.includes("documents"));
});

test("manifest validation rejects a condition on a future capability", () => {
  assert.throws(
    () => defineWorkflowFromBlueprint({
      id: "future-condition",
      vertical: "fixture",
      title: "Future condition",
      route: "/fixture/future-condition",
      archetype: "official-response",
      adapters: ["government"],
      commerce: "none",
      stepConditions: {
        intake: {
          kind: "capability_status",
          capability: "draft",
          status: "passed",
        },
      },
    }),
    /earlier step/,
  );
});
