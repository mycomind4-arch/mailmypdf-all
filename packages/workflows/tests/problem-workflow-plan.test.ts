import assert from "node:assert/strict";
import test from "node:test";
import { planWorkflowFromProblem } from "../src/problem-workflow-plan.js";

const TOOLS = [
  "create_matter", "get_workflow_state", "save_matter_input", "ingest_document",
  "get_document_status", "analyze_matter", "generate_draft", "save_draft",
  "preview_packet", "approve_packet", "prepare_checkout", "get_order_status",
];

test("problem planner offers a certified existing notice without retaining private narrative", () => {
  const result = planWorkflowFromProblem(
    "I received an IRS CP14 notice; my private account number is 1234.", TOOLS,
  );
  assert.equal(result.decision, "review-existing-workflow");
  assert.equal(result.candidates[0]?.id, "notice-respond/cp14-response");
  assert.equal(result.candidates[0]?.chatExecutable, true);
  assert.equal(JSON.stringify(result).includes("1234"), false);
});

test("problem planner requires review when no certified existing workflow matches", () => {
  const unknown = planWorkflowFromProblem("axolotl terrarium plumbing", TOOLS);
  assert.equal(unknown.decision, "needs-template-review");
  assert.equal(unknown.candidates.some((candidate) => candidate.chatExecutable), false);

  const missingTool = planWorkflowFromProblem("CP14 response", TOOLS.filter((tool) => tool !== "approve_packet"));
  assert.equal(missingTool.decision, "needs-template-review");
});
