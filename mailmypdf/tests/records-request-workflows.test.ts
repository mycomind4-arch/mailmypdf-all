import assert from "node:assert/strict";
import test from "node:test";
import { RECORDS_REQUEST_WORKFLOWS, recordsRequestWorkflowMap } from "../src/products/records-request/workflows.ts";
import { recordsRequestProduct } from "../src/products/records-request.ts";

test("records request has 15 executable workflows", () => {
  assert.equal(RECORDS_REQUEST_WORKFLOWS.length, 15);
  assert.equal(recordsRequestProduct.workflowCount, 15);
  assert.equal(recordsRequestProduct.requestTypes.length, 15);
});

test("records request workflow ids and request types are unique", () => {
  assert.equal(new Set(RECORDS_REQUEST_WORKFLOWS.map((workflow) => workflow.id)).size, 15);
  assert.equal(new Set(RECORDS_REQUEST_WORKFLOWS.map((workflow) => workflow.requestType)).size, 15);
  assert.equal(Object.keys(recordsRequestWorkflowMap).length, 15);
});

test("every records request workflow has operational guidance", () => {
  for (const workflow of RECORDS_REQUEST_WORKFLOWS) {
    assert.ok(workflow.name);
    assert.ok(workflow.description);
    assert.ok(workflow.audience);
    assert.ok(workflow.recordScope.length >= 1);
    assert.ok(workflow.requiredInputs.length >= 1);
    assert.ok(workflow.evidenceChecklist.length >= 1);
    assert.ok(workflow.reviewWarnings.length >= 1);
    assert.ok(workflow.promptContext);
    assert.ok(["certified", "certified_return_receipt", "registered"].includes(workflow.defaultMailType));
  }
});
