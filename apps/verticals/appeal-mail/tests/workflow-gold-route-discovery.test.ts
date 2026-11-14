import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { getWorkflow } from "../src/domain/workflows.ts";

// These contracts previously lived under src/routes and were omitted from the
// package's tests/*.test.ts runner while TanStack tried to treat them as routes.
const routeRoot = fileURLToPath(new URL("../src/routes/", import.meta.url));

function misplacedTests(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return misplacedTests(path);
    return entry.isFile() && /\.test\.[cm]?[jt]sx?$/.test(entry.name) ? [path] : [];
  });
}

test("appeal-mail route tree contains no test files", () => {
  assert.deepEqual(misplacedTests(routeRoot), [], "move tests into tests/ so TanStack does not scan them as routes");
});

test("car insurance appeal retains its customer experience contract", () => {
  const workflow = getWorkflow("car-insurance-appeal");
  assert.deepEqual(workflow.experienceStages, ["understand", "build", "send"]);
  assert.equal(workflow.acceptsDocuments, true);
  assert.equal(workflow.primaryKeyword, "car insurance appeal letter");
  assert.equal(workflow.keywordIntent, "transactional");
  assert.ok(workflow.workflowPrompt.includes("auto claim"));
});

test("financial aid reinstatement retains its workflow metadata", () => {
  const workflow = getWorkflow("financial-aid-reinstatement");
  assert.equal(workflow.id, "financial-aid-reinstatement");
  assert.deepEqual(workflow.experienceStages, ["understand", "build", "send"]);
  assert.equal(workflow.acceptsDocuments, true);
  assert.ok(workflow.primaryKeyword?.includes("financial aid reinstatement"));
  assert.ok(workflow.focusAreas.includes("Recovery plan"));
});

test("unemployment denial retains its commercial profile", () => {
  const workflow = getWorkflow("unemployment-denial");
  assert.equal(workflow.primaryKeyword, "unemployment insurance appeal");
  assert.equal(workflow.primaryMsv, 260);
  assert.equal(workflow.primaryCpc, 1.391115);
  assert.equal(workflow.acceptsDocuments, true);
  assert.deepEqual(workflow.experienceStages, ["understand", "build", "send"]);
  assert.ok(workflow.workflowPrompt.includes("unemployment"));
});

test("claim denial letter retains its source-document contract", () => {
  const workflow = getWorkflow("claim-denial-letter");
  assert.equal(workflow.primaryKeyword, "claim denial letter");
  assert.equal(workflow.keywordIntent, "transactional");
  assert.deepEqual(workflow.experienceStages, ["understand", "build", "send"]);
  assert.equal(workflow.acceptsDocuments, true);
  assert.ok(["Denial reason", "Evidence"].every((area) => workflow.focusAreas.includes(area)));
  assert.ok(workflow.workflowPrompt.includes("claim denial letter"));
  assert.ok(workflow.workflowPrompt.includes("what is being denied"));
});

test("financial aid suspension appeal retains its document contract", () => {
  const workflow = getWorkflow("financial-aid-suspension-appeal");
  assert.deepEqual(workflow.experienceStages, ["understand", "build", "send"]);
  assert.equal(workflow.acceptsDocuments, true);
  assert.equal(workflow.primaryKeyword, "financial aid suspension appeal letter sample");
  assert.ok(["Suspension reason", "Academic record", "Circumstances", "Recovery plan"]
    .every((area) => workflow.focusAreas.includes(area)));
  assert.ok(workflow.workflowPrompt.includes("financial aid suspension"));
});
