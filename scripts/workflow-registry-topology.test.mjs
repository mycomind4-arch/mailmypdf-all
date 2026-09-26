import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { workflowRegistryTopologyIssues } from "./workflow-registry-topology.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const workflows = JSON.parse(readFileSync(new URL("../packages/workflows/src/canonical-workflows.json", import.meta.url), "utf8"));
const sections = [...new Set(workflows.map((workflow) => workflow.id.split("/")[0]))];

test("topology guard accepts the current registry and rejects missing/duplicate/orphaned bindings", () => {
  assert.deepEqual(workflowRegistryTopologyIssues(root, sections), []);
  assert.ok(workflowRegistryTopologyIssues(root, sections, workflows.slice(1)).some((issue) => issue.includes("Unregistered root workflow")));
  assert.ok(workflowRegistryTopologyIssues(root, sections, [...workflows, workflows[0]]).some((issue) => issue.includes("Duplicate workflow")));
  const withoutExecution = workflows.map((workflow) => workflow.id === "appeal-mail/appeal-ssdi-denial" ? { ...workflow, execution: undefined } : workflow);
  assert.ok(workflowRegistryTopologyIssues(root, sections, withoutExecution).some((issue) => issue.includes("Start component has no execution binding")));
  const fake = { id: "notice-respond/nonexistent", label: "Missing", execution: { kind: "platform", entry: "public-start", policyFamily: "notice-response" } };
  assert.ok(workflowRegistryTopologyIssues(root, sections, [...workflows, fake]).some((issue) => issue.includes("Missing public start route")));
});
