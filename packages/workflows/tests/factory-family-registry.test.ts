import assert from "node:assert/strict";
import test from "node:test";

import {
  FACTORY_FAMILY_ADAPTERS,
  factoryFamilyForWorkflow,
  planCanonicalCatalogProduction,
} from "../src/factory-family-registry.js";
import {
  WORKFLOW_REGISTRY,
  WORKFLOW_REGISTRY_COUNT,
} from "../src/canonical-workflow-registry.js";

test("catalog planner classifies every canonical workflow exactly once", () => {
  const plan = planCanonicalCatalogProduction();

  assert.equal(plan.total, WORKFLOW_REGISTRY_COUNT);
  assert.equal(plan.total, 441);
  assert.equal(plan.workflows.length, WORKFLOW_REGISTRY.length);

  const plannedIds = new Set(plan.workflows.map((workflow) => workflow.workflowId));
  assert.equal(plannedIds.size, WORKFLOW_REGISTRY_COUNT);

  for (const workflow of WORKFLOW_REGISTRY) {
    const family = factoryFamilyForWorkflow(workflow);
    assert.ok(
      FACTORY_FAMILY_ADAPTERS.some((adapter) => adapter.id === family.id),
      `missing family adapter for ${workflow.id}`,
    );
    assert.ok(plannedIds.has(workflow.id));
  }
});

test("catalog planner exposes the current 441-workflow production queue", () => {
  const plan = planCanonicalCatalogProduction();

  assert.deepEqual(
    {
      total: plan.total,
      complete: plan.complete,
      unfinished: plan.unfinished,
      readyNow: plan.readyNow,
      reviewRequired: plan.reviewRequired,
      orchestratorRequired: plan.orchestratorRequired,
      materializerRequired: plan.materializerRequired,
      adapterRequired: plan.adapterRequired,
    },
    {
      total: 441,
      complete: 24,
      unfinished: 417,
      readyNow: 25,
      reviewRequired: 26,
      orchestratorRequired: 0,
      materializerRequired: 29,
      adapterRequired: 337,
    },
  );
});

test("records-request is immediately buildable while notice-response remains reviewed", () => {
  const plan = planCanonicalCatalogProduction();

  const records = plan.families.find(
    (family) => family.familyId === "records-request",
  );
  assert.ok(records);
  assert.equal(records.total, 30);
  assert.equal(records.complete, 5);
  assert.equal(records.readyNow, 25);
  assert.equal(records.unlockCount, 25);

  const notices = plan.families.find(
    (family) => family.familyId === "notice-response",
  );
  assert.ok(notices);
  assert.equal(notices.total, 31);
  assert.equal(notices.complete, 5);
  assert.equal(notices.reviewRequired, 26);
  assert.equal(notices.unlockCount, 26);
});

test("family summaries rank the largest unfinished production multipliers first", () => {
  const plan = planCanonicalCatalogProduction();
  assert.equal(plan.families[0]?.familyId, "dispute-mail");
  assert.equal(plan.families[0]?.unlockCount, 33);

  for (let index = 1; index < plan.families.length; index += 1) {
    assert.ok(
      plan.families[index - 1]!.unlockCount >=
        plan.families[index]!.unlockCount,
    );
  }
});
