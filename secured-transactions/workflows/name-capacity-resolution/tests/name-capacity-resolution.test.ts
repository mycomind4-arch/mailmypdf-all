import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { compareWorkflowNameForms, normalizeWorkflowName } from "../rules/name-comparison";
import workflowManifest from "../manifest";
import workflowConfig from "../config";
import workflowRuntimeClient from "../start/runtime-client";

describe("Name & Capacity Resolution workflow invariants", () => {
  test("capitalization does not create a separate normalized person", () => {
    const result = compareWorkflowNameForms("JOHN ROBERT SMITH", "John Robert Smith");
    assert.equal(result.disposition, "same-normalized-form");
    assert.equal(result.confidence, 1);
  });

  test("middle initial remains a variant rather than a conclusive identity match", () => {
    const result = compareWorkflowNameForms("John R Smith", "John Robert Smith");
    assert.notEqual(result.disposition, "same-normalized-form");
    assert.ok(result.disposition === "likely-name-variant" || result.disposition === "possible-name-variant");
  });

  test("recognized organization designator punctuation normalizes deterministically", () => {
    const result = compareWorkflowNameForms("Smith Holdings, L.L.C.", "SMITH HOLDINGS LLC");
    assert.equal(result.disposition, "same-normalized-form");
  });

  test("capacity hints stay separate from the normalized primary name", () => {
    const normalized = normalizeWorkflowName("John Smith, Trustee");
    assert.equal(normalized.primaryName, "John Smith");
    assert.ok(normalized.capacityHints.includes("trustee"));
  });

  test("the scaffold cannot perform consequential actions", () => {
    assert.equal(workflowManifest.manifest.maturity, "placeholder");
    assert.equal(workflowManifest.manifest.allowsConsequentialAction, false);
    assert.equal(workflowManifest.manifest.requiresHumanReview, true);
    assert.equal(workflowConfig.indexable, false);
    assert.equal(workflowRuntimeClient.executable, false);
  });
});
