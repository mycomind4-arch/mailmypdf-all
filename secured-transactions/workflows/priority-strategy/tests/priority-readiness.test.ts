import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { buildCompetingInterestMatrix } from "../rules/priority-readiness";
import workflowManifest from "../manifest";

describe("Priority Strategy workflow", () => {
  test("builds an evidence matrix without ranking interests", () => {
    const matrix = buildCompetingInterestMatrix([]);
    assert.ok(matrix.warnings.includes("no-competing-interest-records-supplied"));
    assert.equal("winner" in matrix, false);
  });

  test("strategy workflow remains non-consequential", () => {
    assert.equal(workflowManifest.manifest.allowsConsequentialAction, false);
  });
});
