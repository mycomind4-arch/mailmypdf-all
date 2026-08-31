import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { generateStrategy } from "../src/domain/strategy";
import { createDecision } from "../src/domain/decision";
import { createGround } from "../src/domain/ground";
import { createEvidence } from "../src/domain/evidence";
import type { XRayFinding } from "../src/domain/xray";
import type { StressTestResult } from "../src/domain/stress-test";

/* ═══════════════════════════════════════════════════════════
   PARITY: Strategy Tests
   Tests the response strategy module generates:
   - prioritized grounds (primary/secondary/supporting)
   - evidence gaps
   - recommended organization
   - risks
   - unresolved questions
   - overall assessment
   ═══════════════════════════════════════════════════════════ */

function makeDecision() {
  return createDecision("claim_denial", {
    agency: "Blue Shield Insurance",
    referenceNumber: "CLM-2026-04829",
    decisionDate: "2026-07-15",
    deadline: { type: "appeal", date: "2026-09-13", source: "extracted" },
  });
}

describe("Strategy — Ground Prioritization", () => {
  test("strong ground is primary priority", () => {
    const decision = makeDecision();
    const ground = createGround("factual_error", {
      claim: "The denial cites wrong policy section",
      confidence: 0.85,
    });
    const evidence = createEvidence("document", "Policy Document", {
      groundIds: [ground.id],
    });
    const strategy = generateStrategy(decision, [ground], [evidence], [], null);

    assert.equal(strategy.grounds[0].priority, "primary");
    assert.ok(strategy.grounds[0].strengthScore >= 70);
  });

  test("weak ground is supporting priority", () => {
    const decision = makeDecision();
    const ground = createGround("procedural_error", {
      claim: "Maybe the process wasn't followed",
      confidence: 0.2,
    });
    const strategy = generateStrategy(decision, [ground], [], [], null);

    assert.equal(strategy.grounds[0].priority, "supporting");
  });

  test("medium ground is secondary priority", () => {
    const decision = makeDecision();
    const ground = createGround("insufficient_weight", {
      claim: "Evidence was not given adequate weight",
      confidence: 0.5,
    });
    const strategy = generateStrategy(decision, [ground], [], [], null);

    assert.equal(strategy.grounds[0].priority, "secondary");
  });
});

describe("Strategy — Evidence Gaps", () => {
  test("identifies grounds without evidence as gaps", () => {
    const decision = makeDecision();
    const ground = createGround("factual_error", { claim: "Test claim", confidence: 0.7 });
    const strategy = generateStrategy(decision, [ground], [], [], null);

    assert.ok(strategy.evidenceGaps.length > 0, "Should identify evidence gap");
    assert.equal(strategy.evidenceGaps[0].groundId, ground.id);
  });

  test("does not flag grounds with evidence as gaps", () => {
    const decision = makeDecision();
    const ground = createGround("factual_error", { claim: "Test claim", confidence: 0.7 });
    const evidence = createEvidence("document", "Supporting doc", { groundIds: [ground.id] });
    const strategy = generateStrategy(decision, [ground], [evidence], [], null);

    const gapsForThisGround = strategy.evidenceGaps.filter(g => g.groundId === ground.id);
    assert.equal(gapsForThisGround.length, 0, "Should not flag ground with evidence");
  });
});

describe("Strategy — Risks", () => {
  test("flags missing deadline as high risk", () => {
    const decision = createDecision("claim_denial", { agency: "Test Insurer" });
    const strategy = generateStrategy(decision, [], [], [], null);
    const deadlineRisk = strategy.risks.find(r => r.description.includes("deadline"));
    assert.ok(deadlineRisk, "Should have a deadline risk");
    assert.equal(deadlineRisk!.severity, "high");
  });

  test("flags grounds with no evidence as medium risk", () => {
    const decision = makeDecision();
    const ground = createGround("factual_error", { claim: "Test", confidence: 0.5 });
    const strategy = generateStrategy(decision, [ground], [], [], null);
    const evidenceRisk = strategy.risks.find(r => r.description.includes("no supporting evidence"));
    assert.ok(evidenceRisk, "Should have an evidence risk");
  });
});

describe("Strategy — Unresolved Questions", () => {
  test("includes unresolved ground issues", () => {
    const decision = makeDecision();
    const ground = createGround("factual_error", {
      claim: "Test",
      confidence: 0.5,
      unresolvedIssue: "Need to verify the policy page number",
    });
    const strategy = generateStrategy(decision, [ground], [], [], null);
    assert.ok(
      strategy.unresolvedQuestions.includes("Need to verify the policy page number"),
      "Should include unresolved ground issue",
    );
  });

  test("notes missing reference number", () => {
    const decision = createDecision("claim_denial", { agency: "Test" });
    const strategy = generateStrategy(decision, [], [], [], null);
    assert.ok(
      strategy.unresolvedQuestions.some(q => q.includes("claim/case number")),
      "Should note missing reference number",
    );
  });
});

describe("Strategy — Overall Assessment", () => {
  test("no grounds gives guidance message", () => {
    const decision = makeDecision();
    const strategy = generateStrategy(decision, [], [], [], null);
    assert.ok(strategy.overallAssessment.includes("No appeal grounds"), "Should say no grounds");
  });

  test("strong grounds with evidence gives ready message", () => {
    const decision = makeDecision();
    const ground = createGround("factual_error", { claim: "Test", confidence: 0.85 });
    const evidence = createEvidence("document", "Doc", { groundIds: [ground.id] });
    const strategy = generateStrategy(decision, [ground], [evidence], [], null);
    assert.ok(strategy.overallAssessment.includes("ready for drafting"), "Should say ready for drafting");
  });
});

describe("Strategy — Recommended Organization", () => {
  test("organization starts with stating what is being appealed", () => {
    const decision = makeDecision();
    const strategy = generateStrategy(decision, [], [], [], null);
    assert.ok(
      strategy.recommendedOrganization[0].includes("State what is being appealed"),
      "First item should be about stating what is appealed",
    );
  });

  test("organization includes listing exhibits", () => {
    const decision = makeDecision();
    const ground = createGround("factual_error", { claim: "Test", confidence: 0.8 });
    const evidence = createEvidence("document", "Doc", { groundIds: [ground.id] });
    const strategy = generateStrategy(decision, [ground], [evidence], [], null);
    const exhibitItem = strategy.recommendedOrganization.find(o => o.includes("exhibit"));
    assert.ok(exhibitItem, "Should include exhibit listing step");
  });

  test("organization ends with closing and signature", () => {
    const decision = makeDecision();
    const strategy = generateStrategy(decision, [], [], [], null);
    const lastItem = strategy.recommendedOrganization[strategy.recommendedOrganization.length - 1];
    assert.ok(lastItem.includes("Closing"), "Last item should be closing and signature");
  });
});

describe("Strategy — Recommended Length", () => {
  test("1-2 grounds → 1-2 pages", () => {
    const decision = makeDecision();
    const ground = createGround("factual_error", { claim: "Test", confidence: 0.8 });
    const strategy = generateStrategy(decision, [ground], [], [], null);
    assert.equal(strategy.recommendedLength, "1–2 pages");
  });

  test("5+ grounds → 3-5 pages", () => {
    const decision = makeDecision();
    const grounds = Array.from({ length: 5 }, (_, i) =>
      createGround("factual_error", { claim: `Ground ${i}`, confidence: 0.8 })
    );
    const strategy = generateStrategy(decision, grounds, [], [], null);
    assert.equal(strategy.recommendedLength, "3–5 pages");
  });
});
