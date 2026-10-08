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

test("catalog planner production queue reconciles to live registry", () => {
  const plan = planCanonicalCatalogProduction();
  const dispositionCounts = [
    plan.complete,
    plan.readyNow,
    plan.reviewRequired,
    plan.orchestratorRequired,
    plan.materializerRequired,
    plan.adapterRequired,
  ];

  assert.equal(plan.total, WORKFLOW_REGISTRY_COUNT);
  assert.equal(plan.complete + plan.unfinished, plan.total);
  assert.equal(dispositionCounts.reduce((sum, value) => sum + value, 0), plan.total);
  assert.equal(plan.families.reduce((sum, family) => sum + family.total, 0), plan.total);
  assert.equal(plan.families.reduce((sum, family) => sum + family.complete, 0), plan.complete);

  for (const family of plan.families) {
    assert.equal(family.complete + family.unfinished, family.total);
    assert.equal(family.unlockCount, family.unfinished);
    assert.equal(
      family.complete + family.readyNow + family.reviewRequired +
        family.orchestratorRequired + family.materializerRequired +
        family.adapterRequired,
      family.total,
    );
  }
});

test("records-request is factory-ready while notice-response is review-gated", () => {
  const plan = planCanonicalCatalogProduction();

  const records = plan.families.find((family) => family.familyId === "records-request");
  assert.ok(records);
  assert.equal(records.readiness, "factory-ready");
  assert.equal(records.complete + records.readyNow, records.total);
  assert.equal(
    records.total,
    WORKFLOW_REGISTRY.filter(
      (workflow) => factoryFamilyForWorkflow(workflow).id === "records-request",
    ).length,
  );

  const notices = plan.families.find((family) => family.familyId === "notice-response");
  assert.ok(notices);
  assert.equal(notices.readiness, "review-gated");
  assert.equal(notices.complete + notices.reviewRequired, notices.total);
  assert.equal(
    notices.total,
    WORKFLOW_REGISTRY.filter(
      (workflow) => factoryFamilyForWorkflow(workflow).id === "notice-response",
    ).length,
  );
});

test("family summaries rank unfinished production multipliers first", () => {
  const plan = planCanonicalCatalogProduction();
  assert.ok(plan.families.length > 0);

  for (let index = 1; index < plan.families.length; index += 1) {
    assert.ok(
      plan.families[index - 1]!.unlockCount >= plan.families[index]!.unlockCount,
    );
  }
});
