import assert from "node:assert/strict";
import test from "node:test";
import { noticeRespondCatalog, workflowById } from "../src/domain/workflow-catalog.ts";

const requiredSections = ["searchIntent", "documents", "deadlines", "requirements", "evidence", "analysis", "drafting", "submission", "qualityGate"];

for (const workflow of noticeRespondCatalog) {
  test(`${workflow.id} has a complete master definition`, () => {
    for (const section of requiredSections) {
      assert.ok(workflow[section], `${workflow.id} missing ${section}`);
    }
    assert.ok(workflow.searchIntent.primary);
    assert.ok(workflow.searchIntent.canonicalPath.startsWith("/workflows/"));
    assert.ok(workflow.analysis.capabilities.length > 0);
    assert.ok(workflow.drafting.requiredSections.length > 0);
    assert.ok(workflow.submission.methods.length > 0);
  });

  test(`${workflow.id} has valid lifecycle`, () => {
    assert.ok(["blueprint", "functional", "authority"].includes(workflow.lifecycle));
  });

  test(`${workflow.id} quality gate matches lifecycle`, () => {
    if (workflow.lifecycle === "authority") {
      for (const [key, value] of Object.entries(workflow.qualityGate)) {
        assert.ok(value === true, `${workflow.id}: authority workflow has gate "${key}" set to false`);
      }
    }
    if (workflow.lifecycle === "blueprint") {
      assert.equal(workflow.qualityGate.documentRecognition, false,
        `${workflow.id}: blueprint workflow claims document recognition`);
    }
  });
}

test("the catalog is unique by workflow id", () => {
  const ids = noticeRespondCatalog.map((workflow) => workflow.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("the catalog has unique canonical paths", () => {
  const paths = noticeRespondCatalog.map((workflow) => workflow.searchIntent.canonicalPath);
  assert.equal(new Set(paths).size, paths.length);
});

test("workflowById lookup is consistent with catalog", () => {
  for (const workflow of noticeRespondCatalog) {
    assert.ok(workflowById[workflow.id], `workflowById missing ${workflow.id}`);
    assert.equal(workflowById[workflow.id].id, workflow.id);
  }
});

test("functional workflows have UX metadata", () => {
  const functional = noticeRespondCatalog.filter((w) => w.lifecycle === "functional");
  for (const workflow of functional) {
    assert.ok(workflow.ux, `${workflow.id}: functional workflow should have UX metadata`);
    assert.ok(workflow.ux.steps.length > 0, `${workflow.id}: functional workflow should have steps`);
    assert.ok(workflow.ux.reviewChecks.length > 0, `${workflow.id}: functional workflow should have review checks`);
  }
});

test("cp2000-response is in the catalog with functional lifecycle", () => {
  const cp2000 = workflowById["cp2000-response"];
  assert.ok(cp2000, "CP2000 workflow not found in catalog");
  assert.equal(cp2000.lifecycle, "functional");
  assert.ok(cp2000.qualityGate.documentRecognition, "CP2000 should have document recognition enabled");
  assert.ok(cp2000.qualityGate.draftValidation, "CP2000 should have draft validation enabled");
  assert.ok(cp2000.seo?.faq?.length > 0, "CP2000 should have FAQ entries for SEO");
  assert.ok(cp2000.documents[0].extractionFields.includes("taxYear"), "CP2000 should extract tax year");
  assert.ok(cp2000.documents[0].extractionFields.includes("responseDeadline"), "CP2000 should extract response deadline");
  assert.ok(cp2000.documents[0].extractionFields.includes("proposedChange"), "CP2000 should extract proposed change");
});
