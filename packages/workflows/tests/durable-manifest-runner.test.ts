import assert from "node:assert/strict";
import test from "node:test";
import { CapabilityRuntime } from "../src/capability-runtime.js";
import { runDurableManifestWorkflow, type ManifestWorkflowCheckpointStore, type StoredManifestWorkflowCheckpoint } from "../src/durable-manifest-runner.js";
import { defineWorkflowFromBlueprint } from "../src/workflow-blueprints.js";

function workflow() {
  return defineWorkflowFromBlueprint({
    id: "durable-fixture",
    vertical: "fixture",
    title: "Durable Fixture",
    route: "/fixture/durable",
    archetype: "simple-mail",
    adapters: ["business"],
    commerce: "none",
  });
}

class MemoryStore implements ManifestWorkflowCheckpointStore {
  value: StoredManifestWorkflowCheckpoint | null = null;

  async load() {
    return this.value;
  }

  async commit(input: {
    expectedRevision: number | null;
    checkpoint: any;
  }) {
    const actual = this.value?.revision ?? null;
    if (actual !== input.expectedRevision) {
      throw new Error("checkpoint revision conflict");
    }
    this.value = {
      ...input.checkpoint,
      revision: (actual ?? 0) + 1,
    };
    return this.value;
  }
}

function runtimeFor(
  flow: ReturnType<typeof workflow>,
  statuses: Map<string, "passed" | "warning">,
  calls: Map<string, number>,
) {
  const runtime = new CapabilityRuntime();
  for (const capability of new Set(flow.plan.steps.flatMap((step) => step.capabilities))) {
    runtime.register({
      id: capability,
      async execute() {
        calls.set(capability, (calls.get(capability) ?? 0) + 1);
        return {
          capability,
          status: statuses.get(capability) ?? "passed",
          messages: statuses.get(capability) === "warning"
            ? ["review required"]
            : [],
        };
      },
    });
  }
  return runtime;
}

test("durable runner resumes passed capability results after a blocked run", async () => {
  const flow = workflow();
  const store = new MemoryStore();
  const calls = new Map<string, number>();
  const firstCapability = flow.plan.steps[0]!.capabilities[0]!;
  const secondCapability = flow.plan.steps[0]!.capabilities[1]!;
  const statuses = new Map<string, "passed" | "warning">([
    [secondCapability, "warning"],
  ]);
  const runtime = runtimeFor(flow, statuses, calls);

  const blocked = await runDurableManifestWorkflow({
    workflow: flow,
    runtime,
    store,
    matterId: "m1",
    actorId: "u1",
    scopes: [],
    approvals: (flow.manifest.gates ?? []).map((gate) => gate.id),
    rootInput: {},
  });

  assert.equal(blocked.status, "blocked");
  assert.equal(calls.get(firstCapability), 1);
  assert.equal(calls.get(secondCapability), 1);
  assert.ok(store.value);

  statuses.set(secondCapability, "passed");
  const resumed = await runDurableManifestWorkflow({
    workflow: flow,
    runtime,
    store,
    matterId: "m1",
    actorId: "u1",
    scopes: [],
    approvals: (flow.manifest.gates ?? []).map((gate) => gate.id),
    rootInput: {},
  });

  assert.equal(resumed.status, "completed");
  assert.equal(calls.get(firstCapability), 1);
  assert.equal(calls.get(secondCapability), 2);
});

test("completed durable workflow does not execute providers again", async () => {
  const flow = workflow();
  const store = new MemoryStore();
  const calls = new Map<string, number>();
  const statuses = new Map<string, "passed" | "warning">();
  const runtime = runtimeFor(flow, statuses, calls);
  const input = {
    workflow: flow,
    runtime,
    store,
    matterId: "m2",
    actorId: "u1",
    scopes: [] as string[],
    approvals: (flow.manifest.gates ?? []).map((gate) => gate.id),
    rootInput: {},
  };

  await runDurableManifestWorkflow(input);
  const afterFirst = [...calls.entries()];
  const replay = await runDurableManifestWorkflow(input);

  assert.equal(replay.status, "completed");
  assert.deepEqual([...calls.entries()], afterFirst);
});

test("workflow version changes require explicit checkpoint migration", async () => {
  const flow = workflow();
  const store = new MemoryStore();
  store.value = {
    workflowId: flow.manifest.id,
    version: flow.plan.version + 1,
    matterId: "m3",
    revision: 1,
    status: "running",
    completedStepIds: [],
    executions: [],
  };

  const runtime = new CapabilityRuntime();
  await assert.rejects(
    () => runDurableManifestWorkflow({
      workflow: flow,
      runtime,
      store,
      matterId: "m3",
      actorId: "u1",
      scopes: [],
      approvals: [],
      rootInput: {},
    }),
    /migrate the matter first/,
  );
});
