import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { compareWorkflowNameForms, normalizeWorkflowName } from "../rules/name-comparison";
import workflowManifest from "../manifest";
import workflowConfig from "../config";
import workflowRuntimeClient from "../start/runtime-client";
import { resolveNameCapacity } from "../rules/resolution";

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

  test("the intake cannot perform consequential actions", () => {
    assert.equal(workflowManifest.manifest.maturity, "wired");
    assert.equal(workflowManifest.manifest.allowsConsequentialAction, false);
    assert.equal(workflowManifest.manifest.requiresHumanReview, true);
    assert.equal(workflowConfig.indexable, false);
    assert.equal(workflowRuntimeClient.executable, true);
  });

  test("a supported organization record produces a reviewable resolution", () => {
    const result = resolveNameCapacity({
      primaryName: "Example Holdings LLC",
      alternateNames: ["EXAMPLE HOLDINGS, L.L.C."],
      entityType: "registered-organization",
      capacity: "officer",
      principalName: "Example Holdings LLC",
      sourceLabel: "State business registry",
      sourceType: "official-registry-record",
      sourceId: "registry-1",
    });

    assert.equal(result.name.authoritativeName, "Example Holdings LLC");
    assert.equal(result.entity.authoritativeType, "registered-organization");
    assert.equal(result.capacity.primaryCapacity?.capacity, "officer");
    assert.equal(result.status, "ready-for-review");
  });

  test("missing records block the result instead of inferring identity", () => {
    const result = resolveNameCapacity({
      primaryName: "Example Holdings LLC",
      alternateNames: [],
      entityType: "registered-organization",
      capacity: "officer",
      sourceLabel: "",
      sourceType: "official-registry-record",
      sourceId: "",
    });

    assert.equal(result.status, "blocked");
    assert.equal(result.name.authoritativeName, undefined);
    assert.match(result.reasons.join(" "), /record or source/i);
  });
});
