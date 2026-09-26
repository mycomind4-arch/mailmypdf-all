import assert from "node:assert/strict";
import test from "node:test";
import inventory from "../WORKFLOW_INVENTORY.json";
import priorExecution from "./fixtures/execution-before-canonical-registry.json";
import { projectWorkflowInventory } from "../../packages/workflows/src/canonical-workflow-registry";
import { WORKFLOW_GOLD_CONTENT } from "../src/lib/workflow-gold-content";
import { resolveCaseWorkflow } from "../src/lib/secure-core/workflow-runtime";
import { WORKFLOW_REGISTRY } from "../src/lib/workflow-registry";
import { WORKFLOW_NAV_SECTIONS } from "../src/lib/workflow-navigation";
import { SEO_WORKFLOW_CATALOG } from "../src/lib/workflow-seo-catalog";
import { WORKFLOW_EXECUTION_REGISTRY, workflowExecutionRecord } from "../../packages/workflows/src/workflow-execution-registry";

const canonicalIds = WORKFLOW_REGISTRY.map((workflow) => workflow.id).sort();

test("navigation, inventory, SEO and execution cover exactly the canonical identities", () => {
  for (const [name, ids] of [
    ["navigation", WORKFLOW_NAV_SECTIONS.flatMap((section) => section.workflows.map((workflow) => `${section.id}/${workflow.slug}`))],
    ["inventory", inventory.workflows.map((workflow) => workflow.id)],
    ["SEO", SEO_WORKFLOW_CATALOG.map((workflow) => workflow.id)],
    ["execution", WORKFLOW_EXECUTION_REGISTRY.map((workflow) => `${workflow.sectionId}/${workflow.workflowId}`)],
  ] as const) {
    assert.deepEqual([...ids].sort(), canonicalIds, `${name} identity drift`);
  }
});

test("CP14 remains connected to its existing public start route", () => {
  const cp14 = workflowExecutionRecord("notice-respond", "cp14-response");
  assert.equal(cp14?.executionStatus, "executable");
  assert.equal(cp14?.executionHref, "/notice-respond/workflows/cp14-response/start");
});

test("all previously connected execution URLs are preserved", () => {
  for (const previous of priorExecution) {
    const [section, slug] = previous.id.split("/");
    assert.equal(workflowExecutionRecord(section, slug)?.executionHref, previous.href, previous.id);
  }
});

test("inventory is generated deterministically and preserves referenced content", () => {
  assert.deepEqual(inventory, projectWorkflowInventory());
  for (const workflow of WORKFLOW_REGISTRY) {
    if (workflow.legacyGoldId) assert.ok(WORKFLOW_GOLD_CONTENT[workflow.legacyGoldId], workflow.id);
  }
});

test("every platform binding resolves on the real host; legacy notice runtimes remain available", () => {
  for (const workflow of WORKFLOW_REGISTRY.filter((item) => item.execution?.kind === "platform")) {
    assert.equal(resolveCaseWorkflow(workflow.slug, workflow.sectionId).id, workflow.slug, workflow.id);
  }
  for (const id of ["cp14-response", "cp2000-response", "cp504-response", "cp523-response"]) {
    assert.equal(resolveCaseWorkflow(id, "notice-response").id, id);
  }
  assert.equal(resolveCaseWorkflow("ssdi-denial", "appeal-mail").id, "ssdi-denial");
  for (const workflow of WORKFLOW_REGISTRY.filter((item) => item.execution?.kind === "local")) {
    assert.throws(() => resolveCaseWorkflow(workflow.slug, workflow.sectionId), /enabled case runtime/, workflow.id);
  }
});
