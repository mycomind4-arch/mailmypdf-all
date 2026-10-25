import assert from "node:assert/strict";
import test from "node:test";
import { evaluateFactoryRemoteChecks } from "../src/factory-remote-checks.js";

const required = [
  "Factory generated workflow verification",
  "Shared capability verification",
  "Public workflow landing gate",
  "Workspace UI verification",
  "Records Request verification",
] as const;

test("current successful required runs certify the exact proposal commit", () => {
  const checks = required.map((context) => ({ context, state: "success" as const }));
  const result = evaluateFactoryRemoteChecks(required, checks);
  assert.equal(result.ready, true);
  assert.deepEqual(result.blockedContexts, []);
});

test("a missing required workflow must fail closed", () => {
  const checks = required.slice(1).map((context) => ({ context, state: "success" as const }));
  const result = evaluateFactoryRemoteChecks(required, checks);
  assert.equal(result.ready, false);
  assert.deepEqual(result.blockedContexts, [required[0]]);
});

test("pending, failed and cancelled/error checks all block publication", () => {
  for (const state of ["pending", "failure", "error"] as const) {
    const checks = required.map((context, index) => ({
      context,
      state: index === 2 ? state : ("success" as const),
    }));
    const result = evaluateFactoryRemoteChecks(required, checks);
    assert.equal(result.ready, false, state);
    assert.deepEqual(result.blockedContexts, [required[2]]);
  }
});

test("a historical successful run cannot override a newer failed rerun", () => {
  const checks = [
    { context: required[0], state: "failure" as const },
    ...required.slice(1).map((context) => ({ context, state: "success" as const })),
    { context: required[0], state: "success" as const },
  ];
  assert.deepEqual(evaluateFactoryRemoteChecks(required, checks).blockedContexts, [required[0]]);
});

test("a newer successful rerun supersedes an earlier failed run", () => {
  const checks = [
    ...required.map((context) => ({ context, state: "success" as const })),
    { context: required[0], state: "failure" as const },
  ];
  assert.equal(evaluateFactoryRemoteChecks(required, checks).ready, true);
});

test("unrelated CI runs cannot replace any mandatory required check", () => {
  const result = evaluateFactoryRemoteChecks(required, [
    { context: "An unrelated workflow", state: "success" },
  ]);
  assert.equal(result.ready, false);
  assert.equal(result.blockedContexts.length, required.length);
});

test("empty required contexts never certify publication", () => {
  const result = evaluateFactoryRemoteChecks([], [
    { context: "Any workflow", state: "success" },
  ]);
  assert.equal(result.ready, false);
});
