import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  GOLD_STANDARD_PIPELINE_STAGES,
  hasCompleteIntelligence,
  isGoldStandardPipeline,
  runGoldStandardPipeline,
  type DomainPack,
  type StageResult,
} from "../src/index.js";

const passed = (stage: string): StageResult => ({ stage: stage as any, status: "passed", messages: [] });

/** Map from pipeline stage name to DomainPack method name. */
const stageToMethod: Record<string, keyof DomainPack> = {
  security: "security",
  classification: "classify",
  extraction: "extract",
  provenance: "provenance",
  deadline: "deadlines",
  contradiction: "contradictions",
  findings: "findings",
  discrepancy: "discrepancies",
  evidence: "evidence",
  research: "research",
  risk: "risk",
  strategy: "strategy",
  draft: "draft",
  draftProvenance: "draftProvenance",
  validation: "validation",
  review: "review",
  approval: "approval",
  mailing: "mailing",
  tracking: "tracking",
  proofAudit: "proofAudit",
};

function makePack(): DomainPack {
  const pack: Record<string, any> = {
    id: "fixture",
    security: async () => passed("security"),
    classify: async () => passed("classification"),
    extract: async () => passed("extraction"),
  };
  for (const stage of GOLD_STANDARD_PIPELINE_STAGES) {
    if (stage === "blockingGate") continue;
    const method = stageToMethod[stage];
    if (method && !pack[method]) {
      pack[method] = async () => passed(stage);
    }
  }
  return pack as DomainPack;
}

describe("gold-standard pipeline", () => {
  test("executes the complete lifecycle in canonical order", async () => {
    const result = await runGoldStandardPipeline("fixture", makePack(), { documents: [] });
    assert.equal(result.status, "completed");
    assert.deepEqual(result.stages.map((stage) => stage.stage), GOLD_STANDARD_PIPELINE_STAGES);
    assert.equal(hasCompleteIntelligence(result), true);
    assert.equal(isGoldStandardPipeline(result), true);
  });

  test("blocks before consequential actions when validation fails", async () => {
    const pack = makePack();
    pack.validation = async () => ({ stage: "validation", status: "blocked", messages: ["missing evidence"] });
    const result = await runGoldStandardPipeline("fixture", pack, { documents: [] });
    assert.equal(result.status, "blocked");
    assert.deepEqual(result.stages.map((stage) => stage.stage), [
      ...GOLD_STANDARD_PIPELINE_STAGES.slice(0, 15),
      "blockingGate",
    ]);
  });

  test("rejects adapter stage mismatches", async () => {
    const pack = makePack();
    pack.extract = async () => passed("classification");
    const result = await runGoldStandardPipeline("fixture", pack, { documents: [] });
    assert.equal(result.status, "blocked");
    // The extraction stage should be recorded as failed due to stage mismatch
    const extraction = result.stages.find((s) => s.stage === "extraction");
    assert.equal(extraction?.status, "failed");
    // The blockingGate should be present and blocked (validation never ran)
    const gate = result.stages.find((s) => s.stage === "blockingGate");
    assert.equal(gate?.status, "blocked");
  });

  test("blocks when approval fails", async () => {
    const pack = makePack();
    pack.approval = async () => ({ stage: "approval", status: "blocked", messages: ["human approval required"] });
    const result = await runGoldStandardPipeline("fixture", pack, { documents: [] });
    assert.equal(result.status, "blocked");
    assert.equal(result.stages.at(-1)?.stage, "approval");
    assert.equal(isGoldStandardPipeline(result), false);
  });
});
