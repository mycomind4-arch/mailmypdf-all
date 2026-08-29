import assert from "node:assert/strict";
import test from "node:test";
import { configuredPipelineStages } from "../src/configured-pipeline.js";
import type { PipelineStage } from "../src/gold-standard-pipeline.js";

const noopPack = (stages: readonly PipelineStage[]) => {
  const pack: Record<string, unknown> = {};
  for (const stage of stages) {
    const method = stage === "security" ? "security" : stage === "classification" ? "classify" : stage === "extraction" ? "extract" : stage;
    pack[method] = async (_input: unknown, _prior: readonly unknown[]) => ({ stage, status: "passed" as const, messages: [] });
  }
  return pack;
};

test("P02 includes its required stages in canonical order", () => {
  const stages = configuredPipelineStages("P02_OFFICIAL_RESPONSE");
  assert.ok(stages.includes("requirements"));
  assert.ok(stages.includes("draftProvenance"));
  assert.ok(stages.indexOf("draft") < stages.indexOf("validation"));
});

test("optional specialist stages can be enabled without changing route identity", () => {
  const stages = configuredPipelineStages("P02_OFFICIAL_RESPONSE", ["contradiction", "discrepancy", "risk"]);
  assert.ok(stages.includes("contradiction"));
  assert.ok(stages.includes("discrepancy"));
  assert.ok(stages.includes("risk"));
});

test("P01 stays lean and does not silently inherit every Gold stage", () => {
  const stages = configuredPipelineStages("P01_CORE_MAIL");
  assert.ok(stages.includes("draft"));
  assert.ok(stages.includes("mailing"));
  assert.equal(stages.includes("research"), false);
  assert.equal(stages.includes("requirements"), false);
});
