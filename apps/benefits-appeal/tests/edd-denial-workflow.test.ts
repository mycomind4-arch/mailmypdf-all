import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { getWorkflow } from "../src/domain/workflows";

describe("EDD denial workflow", () => {
  test("has California EDD-specific gold workflow metadata", () => {
    const w = getWorkflow("edd-denial");
    assert.ok(w.title.includes("EDD"));
    assert.equal(w.primaryKeyword, "appeal EDD denial");
    assert.deepEqual([...w.experienceStages], ["understand", "build", "send"]);
    assert.equal(w.acceptsDocuments, true);
    assert.match(w.workflowPrompt, /EDD|Employment Development Department|California/i);
  });
});
