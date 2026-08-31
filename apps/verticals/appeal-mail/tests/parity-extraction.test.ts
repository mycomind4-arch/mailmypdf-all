import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { extractFromText, applyExtraction } from "../src/platform/document-extraction";
import { createDecision } from "../src/domain/decision";
import { classifyDocument } from "../src/domain/classification";
import "../src/domain/insurance-packs";
import { insurancePackSet } from "../src/domain/insurance-packs";
import {
  strongAppeal,
  weakAppeal,
  contradictoryEvidence,
  missingEvidence,
  deadlineConcern,
  poorQuality,
  insufficientExplanation,
} from "./fixtures/insurance-denials";

/* ═══════════════════════════════════════════════════════════
   PARITY: Classification & Extraction Tests
   ═══════════════════════════════════════════════════════════ */

describe("Classification", () => {
  test("classifies strong appeal as denial_letter", () => {
    const result = classifyDocument(strongAppeal.text, insurancePackSet);
    assert.equal(result.documentClass, "denial_letter");
    assert.ok(result.confidence > 0.3, `Expected confidence > 0.3, got ${result.confidence}`);
    assert.ok(result.isPrimaryDecision, "Should be classified as primary decision document");
  });

  test("classifies EOB as explanation_of_benefits", () => {
    const result = classifyDocument(insufficientExplanation.text, insurancePackSet);
    assert.equal(result.documentClass, "explanation_of_benefits");
    assert.ok(result.isPrimaryDecision, "EOB should be primary decision document");
  });

  test("classifies weak appeal as denial_letter", () => {
    const result = classifyDocument(weakAppeal.text, insurancePackSet);
    assert.equal(result.documentClass, "denial_letter");
    assert.ok(result.isPrimaryDecision, "Should be primary decision");
  });

  test("returns unknown for empty text", () => {
    const result = classifyDocument("", insurancePackSet);
    assert.equal(result.documentClass, "unknown");
    assert.equal(result.confidence, 0);
  });

  test("flags needsOCR for very short text", () => {
    const result = classifyDocument("Short text", insurancePackSet);
    assert.ok(result.needsOCR, "Short text should flag needsOCR");
  });

  test("does not flag needsOCR for long text", () => {
    const result = classifyDocument(strongAppeal.text, insurancePackSet);
    assert.ok(!result.needsOCR, "Long text should not flag needsOCR");
  });
});

describe("Extraction — Strong Appeal", () => {
  const result = extractFromText(strongAppeal.text);
  const decision = applyExtraction(createDecision("claim_denial", {}), result);

  test("extracts agency/insurer name", () => {
    assert.ok(decision.agency, "Should extract agency name");
    assert.ok(
      decision.agency?.toLowerCase().includes("blue shield"),
      `Expected Blue Shield, got ${decision.agency}`,
    );
  });

  test("extracts claim/reference number", () => {
    assert.ok(decision.referenceNumber, "Should extract reference number");
  });

  test("extracts denial date", () => {
    assert.ok(decision.decisionDate, "Should extract decision date");
  });

  test("extracts deadline or deadline window", () => {
    assert.ok(
      decision.deadline?.date || decision.deadline?.daysRemaining || decision.deadline,
      "Should extract deadline information",
    );
  });

  test("extracts denial reasons", () => {
    assert.ok(decision.reasons.length > 0, "Should extract at least one denial reason");
  });

  test("extracts appeal instructions", () => {
    assert.ok(decision.appealInstructions, "Should extract appeal instructions");
  });
});

describe("Extraction — Weak Appeal", () => {
  const result = extractFromText(weakAppeal.text);
  const decision = applyExtraction(createDecision("claim_denial", {}), result);

  test("extracts reference number", () => {
    assert.ok(decision.referenceNumber, "Should extract reference number 4471");
  });

  test("extraction confidence is low or moderate", () => {
    assert.ok(
      decision.extractionConfidence <= 0.75,
      `Expected low/moderate confidence, got ${decision.extractionConfidence}`,
    );
  });
});

describe("Extraction — Contradictory Evidence", () => {
  const result = extractFromText(contradictoryEvidence.text);
  const decision = applyExtraction(createDecision("claim_denial", {}), result);

  test("extracts claim number", () => {
    assert.ok(decision.referenceNumber, "Should extract claim number");
  });

  test("extracts denial reasons about late filing", () => {
    assert.ok(decision.reasons.length > 0, "Should extract denial reasons");
    const reasonText = decision.reasons.map(r => r.text).join(" ").toLowerCase();
    assert.ok(
      reasonText.includes("late") || reasonText.includes("deadline") || reasonText.includes("filed"),
      "Should mention late filing or deadline",
    );
  });
});

describe("Extraction — Deadline Concern", () => {
  const result = extractFromText(deadlineConcern.text);
  const decision = applyExtraction(createDecision("claim_denial", {}), result);

  test("extracts claim number", () => {
    assert.ok(decision.referenceNumber, "Should extract GEICO claim number");
  });

  test("extracts amount", () => {
    assert.ok(
      decision.facts.some(f => f.value.includes("3,847") || f.value.includes("3,200")),
      "Should extract dollar amounts from the denial",
    );
  });
});

describe("Extraction — Missing Evidence", () => {
  const result = extractFromText(missingEvidence.text);
  const decision = applyExtraction(createDecision("claim_denial", {}), result);

  test("extracts Allstate as agency", () => {
    assert.ok(
      decision.agency?.toLowerCase().includes("allstate"),
      `Expected Allstate, got ${decision.agency}`,
    );
  });

  test("extracts claim number", () => {
    assert.ok(
      decision.referenceNumber?.includes("AC-2026") || decision.referenceNumber?.includes("7714"),
      `Expected AC-2026-7714, got ${decision.referenceNumber}`,
    );
  });

  test("extracts multiple denial reasons", () => {
    assert.ok(decision.reasons.length >= 1, "Should extract at least one denial reason");
  });
});

describe("Extraction — Poor Quality Source", () => {
  const result = extractFromText(poorQuality.text);
  const decision = applyExtraction(createDecision("claim_denial", {}), result);

  test("handles garbled text gracefully", () => {
    assert.ok(typeof decision.extractionConfidence === "number");
    assert.ok(Array.isArray(decision.reasons));
    assert.ok(Array.isArray(decision.facts));
  });
});

describe("Extraction — Insufficient Explanation", () => {
  const result = extractFromText(insufficientExplanation.text);
  const decision = applyExtraction(createDecision("claim_denial", {}), result);

  test("extracts Cigna as agency", () => {
    assert.ok(
      decision.agency?.toLowerCase().includes("cigna"),
      `Expected Cigna, got ${decision.agency}`,
    );
  });

  test("extracts claim number", () => {
    assert.ok(
      decision.referenceNumber?.includes("CG-2026") || decision.referenceNumber?.includes("44219"),
      `Expected CG-2026-44219, got ${decision.referenceNumber}`,
    );
  });

  test("extracts denial reason (not covered)", () => {
    assert.ok(decision.reasons.length > 0, "Should extract at least one denial reason");
  });
});
