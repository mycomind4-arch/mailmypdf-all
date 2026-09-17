import assert from "node:assert/strict";
import test from "node:test";
import {
  appealMailRuntimePolicyFor,
  appealMailStartRouteFor,
  appealMailStartRoutes,
} from "../runtime.js";

const expectedInsuranceWorkflows = [
  "appeal-car-insurance-claim",
  "appeal-denied-claim",
  "appeal-insurance-claim-denial",
  "appeal-medical-insurance-denial",
  "appeal-prior-authorization-denial",
  "appeal-insurance-coverage-denial",
  "appeal-medical-necessity-denial",
  "appeal-out-of-network-denial",
  "appeal-dental-insurance-denial",
  "appeal-life-insurance-denial",
] as const;

test("Appeal Mail exposes one unique start registration for every migrated insurance workflow", () => {
  assert.equal(appealMailStartRoutes.length, expectedInsuranceWorkflows.length);
  assert.deepEqual(
    new Set(appealMailStartRoutes.map((route) => route.workflowId)),
    new Set(expectedInsuranceWorkflows),
  );
  assert.equal(
    new Set(appealMailStartRoutes.map((route) => route.path)).size,
    appealMailStartRoutes.length,
  );

  for (const workflowId of expectedInsuranceWorkflows) {
    const route = appealMailStartRouteFor(workflowId);
    assert.ok(route, workflowId);
    assert.equal(route.path, `/appeal-mail/workflows/${workflowId}/start/`);
    assert.equal(typeof route.load, "function");
    assert.ok(appealMailRuntimePolicyFor(workflowId), workflowId);
  }
});

test("Appeal Mail runtime registration fails closed for unknown workflows", () => {
  assert.equal(appealMailStartRouteFor("appeal-not-real"), null);
  assert.equal(appealMailRuntimePolicyFor("appeal-not-real"), null);
});
