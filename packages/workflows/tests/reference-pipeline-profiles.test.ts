import assert from "node:assert/strict";
import test from "node:test";
import { pipelineIds } from "../src/pipeline-registry.js";
import { REFERENCE_PIPELINE_PROFILES, referenceStages } from "../src/reference-pipeline-profiles.js";

test("every canonical pipeline has a reference profile", () => {
  for (const id of pipelineIds) {
    assert.ok(REFERENCE_PIPELINE_PROFILES[id], `missing reference profile for ${id}`);
    assert.ok(REFERENCE_PIPELINE_PROFILES[id].representativeWorkflows.length > 0);
    assert.ok(referenceStages(id).length > 0);
  }
});

test("reference P02, P03 and P06 include their specialist intelligence stages", () => {
  for (const id of ["P02_OFFICIAL_RESPONSE", "P03_APPEAL", "P06_DISPUTE"] as const) {
    const stages = referenceStages(id);
    assert.ok(stages.includes("research"));
    assert.ok(stages.includes("risk"));
    assert.ok(stages.includes("evidence"));
    assert.ok(stages.includes("validation"));
  }
});
