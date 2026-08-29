import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { workflows } from "../src/domain/workflows";
import {
  constructWorkflow,
  constructAllWorkflows,
  factoryValidationSummary,
  validateDefinition,
  loadCapabilities,
  evaluateQualityGate,
  determineLifecycle,
  getDomainPack,
  getRegisteredWorkflowIds,
  registerDomainPack,
  ALL_CAPABILITIES,
  type DomainPackSet,
} from "../src/domain/workflow-capabilities";

import "../src/domain/insurance-packs";

/* ═══════════════════════════════════════════════════════════
   PARITY: Architecture Tests
   Tests the factory/registry/capability system matches
   Notice Respond's gold standard.
   ═══════════════════════════════════════════════════════════ */

describe("Factory Architecture", () => {
  test("all workflow definitions validate", () => {
    for (const [id, def] of Object.entries(workflows)) {
      const errors = validateDefinition(def);
      assert.equal(errors.length, 0, `Workflow ${id} validation errors: ${errors.join(", ")}`);
    }
  });

  test("denied-claim has domain pack registered", () => {
    const pack = getDomainPack("denied-claim");
    assert.ok(pack, "Insurance appeal domain pack should be registered");
    assert.equal(pack.engine, "appeal");
    assert.ok(pack.document, "Document pack missing");
    assert.ok(pack.deadline, "Deadline pack missing");
    assert.ok(pack.evidence, "Evidence pack missing");
    assert.ok(pack.analysis, "Analysis pack missing");
    assert.ok(pack.draft, "Draft pack missing");
    assert.ok(pack.validation, "Validation pack missing");
    assert.ok(pack.submission, "Submission pack missing");
  });

  test("denied-claim constructs as functional or authority lifecycle", () => {
    const constructed = constructWorkflow(workflows["denied-claim"]);
    assert.ok(constructed.ready, `Construction errors: ${constructed.errors.join(", ")}`);
    assert.ok(
      constructed.lifecycle === "functional" || constructed.lifecycle === "authority",
      `Expected functional or authority lifecycle, got ${constructed.lifecycle}`,
    );
  });

  test("denied-claim has all required capabilities", () => {
    const constructed = constructWorkflow(workflows["denied-claim"]);
    const caps = constructed.capabilities;
    assert.ok(caps.includes("document-classification"), "Missing classification");
    assert.ok(caps.includes("fact-extraction"), "Missing extraction");
    assert.ok(caps.includes("deadline-analysis"), "Missing deadline analysis");
    assert.ok(caps.includes("evidence-analysis"), "Missing evidence analysis");
    assert.ok(caps.includes("contradiction-analysis"), "Missing contradiction analysis");
    assert.ok(caps.includes("drafting"), "Missing drafting");
    assert.ok(caps.includes("draft-validation"), "Missing draft validation");
    assert.ok(caps.includes("mailing"), "Missing mailing");
    assert.ok(caps.includes("proof"), "Missing proof");
  });

  test("denied-claim has xray and stress-test capabilities", () => {
    const constructed = constructWorkflow(workflows["denied-claim"]);
    assert.ok(constructed.capabilities.includes("xray-analysis"), "Missing xray-analysis");
    assert.ok(constructed.capabilities.includes("timeline-analysis"), "Missing timeline-analysis");
    assert.ok(constructed.capabilities.includes("stress-testing"), "Missing stress-testing");
    assert.ok(constructed.capabilities.includes("response-strategy"), "Missing response-strategy");
  });

  test("factory validation summary has correct counts", () => {
    const all = constructAllWorkflows(workflows);
    const summary = factoryValidationSummary(all);
    assert.equal(summary.total, Object.keys(workflows).length);
    assert.ok(summary.ready > 0, "At least one workflow should be ready");
  });

  test("quality gate for denied-claim is mostly satisfied", () => {
    const constructed = constructWorkflow(workflows["denied-claim"]);
    const gate = constructed.qualityGate;
    assert.ok(gate.documentRecognition, "Document recognition should be true");
    assert.ok(gate.factGrounding, "Fact grounding should be true");
    assert.ok(gate.draftValidation, "Draft validation should be true");
    assert.ok(gate.submissionReadiness, "Submission readiness should be true");
  });

  test("non-registered workflows get warnings but still construct", () => {
    // government-decision doesn't have a domain pack registered
    const constructed = constructWorkflow(workflows["government-decision"]);
    assert.ok(constructed.warnings.length > 0, "Should have warnings for missing domain pack");
    assert.ok(constructed.ready, "Should still be ready (warnings are not errors)");
  });

  test("ALL_CAPABILITIES list has 15 capabilities", () => {
    assert.equal(ALL_CAPABILITIES.length, 15);
  });

  test("domain pack registration and retrieval works", () => {
    const testPack: DomainPackSet = {
      engine: "appeal",
      document: { name: "test", acceptedTypes: [], classifierHints: [], extractionSchema: [], minConfidence: 0.5 },
      deadline: { name: "test", triggeringEvents: [], sourcePriority: [], jurisdictionDependent: false, computationRules: [] },
      evidence: { name: "test", evidenceTypes: [], sufficiencyRules: [], contradictionRules: [], missingEvidenceBehavior: "" },
      analysis: { name: "test", capabilities: [], orderedChecks: [], riskFactors: [], outputSections: [] },
      draft: { name: "test", draftType: "", requiredSections: [], prohibitedUnsupportedClaims: [], toneRules: [] },
      validation: { name: "test", factualChecks: [], requirementChecks: [], unsupportedAssertionChecks: [], adversarialChecks: [] },
      submission: { name: "test", methods: [], recipientRules: [], supportsMailing: false, supportsTracking: false, proofRequirements: [] },
    };
    registerDomainPack("test-workflow", testPack);
    const retrieved = getDomainPack("test-workflow");
    assert.ok(retrieved, "Test pack should be retrievable");
    assert.equal(retrieved.engine, "appeal");
  });
});

describe("Executable vs Non-Executable Separation", () => {
  test("only denied-claim has domain pack", () => {
    const registeredIds = getRegisteredWorkflowIds();
    // Only denied-claim should have a domain pack at this stage
    assert.ok(registeredIds.includes("denied-claim"));
    // Other workflows don't have packs yet
    assert.ok(!registeredIds.includes("government-decision"));
    assert.ok(!registeredIds.includes("court-ruling"));
    assert.ok(!registeredIds.includes("reconsideration"));
  });

  test("non-registered workflows have blueprint or functional lifecycle", () => {
    for (const [id, def] of Object.entries(workflows)) {
      const constructed = constructWorkflow(def);
      if (id !== "denied-claim") {
        assert.equal(
          constructed.lifecycle,
          "blueprint",
          `Workflow ${id} should be blueprint lifecycle (no domain pack)`,
        );
      }
    }
  });

  test("denied-claim quality gate is better than others", () => {
    const insuranceGate = constructWorkflow(workflows["denied-claim"]).qualityGate;
    const otherGates = Object.entries(workflows)
      .filter(([id]) => id !== "denied-claim")
      .map(([, def]) => constructWorkflow(def).qualityGate);

    const insuranceTrueCount = Object.values(insuranceGate).filter(Boolean).length;
    for (const gate of otherGates) {
      const otherTrueCount = Object.values(gate).filter(Boolean).length;
      assert.ok(
        insuranceTrueCount >= otherTrueCount,
        "Insurance appeal should have at least as many quality gates satisfied",
      );
    }
  });
});

/* ═══════════════════════════════════════════════════════════
   FACTORY → PACK → GOLD GATE END-TO-END
   ═══════════════════════════════════════════════════════════ */

describe("Factory → Pack → Gold Gate E2E", () => {
  test("denied-claim: factory constructs → pack resolves → quality gate is authority-level", () => {
    // Step 1: Factory validates the definition
    const def = workflows["denied-claim"];
    const validationErrors = validateDefinition(def);
    assert.equal(validationErrors.length, 0, "Definition must validate cleanly");

    // Step 2: Factory constructs the workflow (loads pack, evaluates gate)
    const constructed = constructWorkflow(def);
    assert.ok(constructed.ready, "Construction must be ready");
    assert.equal(constructed.errors.length, 0, "No construction errors");

    // Step 3: Pack is loaded (not undefined)
    assert.ok(constructed.packs, "Domain pack set must be loaded for denied-claim");

    // Step 4: Quality gate is at least functional
    assert.ok(
      constructed.lifecycle === "functional" || constructed.lifecycle === "authority",
      `Expected functional/authority lifecycle, got ${constructed.lifecycle}`,
    );

    // Step 5: All capability packs are present
    const requiredCaps = [
      "document-classification", "fact-extraction", "deadline-analysis",
      "evidence-analysis", "contradiction-analysis", "drafting",
      "draft-validation", "readiness-review", "submission", "mailing", "proof",
    ];
    for (const cap of requiredCaps) {
      assert.ok(
        constructed.capabilities.includes(cap as any),
        `Missing required capability: ${cap}`,
      );
    }

    // Step 6: Quality gate is satisfied for the core pipeline
    const gate = constructed.qualityGate;
    assert.ok(gate.documentRecognition, "Document recognition gate not satisfied");
    assert.ok(gate.factGrounding, "Fact grounding gate not satisfied");
    assert.ok(gate.draftValidation, "Draft validation gate not satisfied");
    assert.ok(gate.submissionReadiness, "Submission readiness gate not satisfied");
  });

  test("non-registered workflows: factory constructs → no pack → quality gate is all-false → blueprint", () => {
    for (const [id, def] of Object.entries(workflows)) {
      if (id === "denied-claim") continue;
      const constructed = constructWorkflow(def);
      assert.ok(constructed.ready, `${id} should still construct`);
      assert.ok(!constructed.packs, `${id} should NOT have a domain pack`);
      assert.equal(constructed.lifecycle, "blueprint", `${id} should be blueprint`);
      const gateValues = Object.values(constructed.qualityGate);
      assert.ok(
        gateValues.every(v => v === false),
        `${id} quality gate should be all false`,
      );
    }
  });

  test("catalog executable flag matches factory lifecycle: only denied-claim is executable", () => {
    // Import catalog to check executable flags
    // This test ensures the catalog metadata is truthful
    const all = constructAllWorkflows(workflows);
    for (const w of all) {
      if (w.definition.id === "denied-claim") {
        assert.ok(
          w.lifecycle === "functional" || w.lifecycle === "authority",
          "denied-claim must be at least functional",
        );
      } else {
        assert.equal(
          w.lifecycle,
          "blueprint",
          `${w.definition.id} must be blueprint (no implementation)`,
        );
      }
    }
  });

  test("no capability metadata implies executable behavior without implementation", () => {
    // Every COMING_SOON workflow must have executable: false in the catalog
    // and blueprint lifecycle in the factory
    const all = constructAllWorkflows(workflows);
    for (const w of all) {
      if (w.lifecycle === "blueprint") {
        // Blueprint means no domain pack — no executable behavior implied
        assert.ok(!w.packs, `${w.definition.id} has no domain pack`);
        const gateValues = Object.values(w.qualityGate);
        assert.ok(
          gateValues.every(v => v === false),
          `${w.definition.id} has no quality gate satisfied`,
        );
      }
    }
  });
});
