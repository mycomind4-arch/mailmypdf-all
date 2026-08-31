import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { APPEAL_CATALOG, CATEGORY_ORDER, getWorkflowBySlug, getWorkflowsByCategory } from "../src/domain/appeal-catalog";
import { workflows, getWorkflow, workflowIds, appealWorkflowCount } from "../src/domain/workflows";

describe("Benefits Appeal catalog", () => {
  test("every catalog entry maps to an executable workflow", () => {
    for (const entry of APPEAL_CATALOG) {
      assert.ok(entry.workflowRoute, `Missing workflowRoute for ${entry.slug}`);
      const wfId = entry.workflowRoute.replace("/workflows/", "");
      assert.ok(workflows[wfId], `Workflow ${wfId} not found for catalog entry ${entry.slug}`);
    }
  });

  test("every catalog entry has SEO metadata", () => {
    for (const entry of APPEAL_CATALOG) {
      assert.ok(entry.seoTitle, `Missing seoTitle for ${entry.slug}`);
      assert.ok(entry.seoDescription, `Missing seoDescription for ${entry.slug}`);
      assert.ok(entry.primaryKeyword, `Missing primaryKeyword for ${entry.slug}`);
      assert.ok(entry.relatedKeywords.length > 0, `Missing relatedKeywords for ${entry.slug}`);
    }
  });

  test("every category in CATEGORY_ORDER has at least one entry", () => {
    for (const cat of CATEGORY_ORDER) {
      const entries = getWorkflowsByCategory(cat);
      assert.ok(entries.length > 0, `No entries for category ${cat}`);
    }
  });

  test("all catalog entries have unique slugs", () => {
    const slugs = APPEAL_CATALOG.map((e) => e.slug);
    assert.equal(new Set(slugs).size, slugs.length, "Duplicate slugs found");
  });

  test("getWorkflowBySlug returns the correct entry", () => {
    const entry = getWorkflowBySlug("ssdi-denial");
    assert.ok(entry);
    assert.equal(entry.title, "Appeal an SSDI Denial");
  });
});

describe("Benefits Appeal workflow definitions", () => {
  test("every workflow has a title, description, and prompt", () => {
    for (const [id, wf] of Object.entries(workflows)) {
      assert.ok(wf.title, `Missing title for ${id}`);
      assert.ok(wf.description, `Missing description for ${id}`);
      assert.ok(wf.workflowPrompt, `Missing workflowPrompt for ${id}`);
    }
  });

  test("every workflow has the full lifecycle steps", () => {
    for (const [id, wf] of Object.entries(workflows)) {
      assert.equal(wf.steps.length, 18, `Wrong step count for ${id}`);
      assert.equal(wf.stepLabels.length, 18, `Wrong label count for ${id}`);
    }
  });

  test("getWorkflow throws for unknown id", () => {
    assert.throws(() => getWorkflow("nonexistent"));
  });

  test("getWorkflow returns the correct workflow", () => {
    const w = getWorkflow("ssdi-denial");
    assert.ok(w.title.includes("SSDI"));
    assert.equal(w.primaryKeyword, "denied SSDI");
  });

  test("workflowIds and appealWorkflowCount are consistent", () => {
    assert.equal(workflowIds.length, appealWorkflowCount);
    assert.equal(workflowIds.length, Object.keys(workflows).length);
  });
});
