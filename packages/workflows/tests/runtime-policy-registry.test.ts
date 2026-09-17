import assert from "node:assert/strict";
import test from "node:test";
import {
  WorkflowRuntimePolicyRegistry,
  createWorkflowRuntimePolicyResolver,
  platformWorkflowRuntimePolicyFor,
  type WorkflowRuntimePolicy,
} from "../src/index.js";

function policy(id: string): WorkflowRuntimePolicy {
  return {
    validateMatter(input) {
      if (input.workflowId !== id) throw new Error("wrong workflow");
    },
    validateAnalysis() {},
    validateInput(input) {
      return input;
    },
  };
}

test("runtime policy registry resolves one matching provider", () => {
  const a = policy("a");
  const b = policy("b");
  const resolver = createWorkflowRuntimePolicyResolver(
    (workflowId) => (workflowId === "a" ? a : null),
    (workflowId) => (workflowId === "b" ? b : null),
  );
  assert.equal(resolver("a"), a);
  assert.equal(resolver("b"), b);
  assert.equal(resolver("missing"), null);
});

test("runtime policy registry rejects duplicate provider registration", () => {
  const provider = () => null;
  const registry = new WorkflowRuntimePolicyRegistry().register(provider);
  assert.throws(() => registry.register(provider), /already registered/i);
});

test("runtime policy registry fails closed when two providers claim one workflow", () => {
  const first = policy("shared");
  const second = policy("shared");
  const resolver = createWorkflowRuntimePolicyResolver(
    (workflowId) => (workflowId === "shared" ? first : null),
    (workflowId) => (workflowId === "shared" ? second : null),
  );
  assert.throws(() => resolver("shared"), /Multiple runtime policy providers matched/i);
});

test("platform resolver includes migrated insurance appeal workflows", () => {
  assert.ok(platformWorkflowRuntimePolicyFor("appeal-denied-claim"));
  assert.ok(platformWorkflowRuntimePolicyFor("appeal-medical-insurance-denial"));
  assert.equal(platformWorkflowRuntimePolicyFor("not-migrated"), null);
});
