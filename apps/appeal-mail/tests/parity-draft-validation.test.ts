import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { validateAppealDraft } from "../src/domain/draft-validator";
import { createDecision } from "../src/domain/decision";
import { createGround } from "../src/domain/ground";
import { createEvidence } from "../src/domain/evidence";
import "../src/domain/insurance-packs";
import { insurancePackSet } from "../src/domain/insurance-packs";
import { extractFromText, applyExtraction } from "../src/platform/document-extraction";
import { strongAppeal } from "./fixtures/insurance-denials";

/* ═══════════════════════════════════════════════════════════
   PARITY: Draft Validation Tests
   Tests the independent draft validator catches:
   - missing required sections
   - unsupported amounts
   - forbidden claims (guaranteed outcomes)
   - unresolved placeholders
   - unsupported grounds without evidence
   - empty draft (block)
   - missing requested action
   ═══════════════════════════════════════════════════════════ */

function setupDecision() {
  const result = extractFromText(strongAppeal.text);
  return applyExtraction(createDecision("claim_denial", {}), result);
}

describe("Draft Validation — Required Sections", () => {
  test("passes with all required sections present", () => {
    const decision = setupDecision();
    const draft = "Re: Appeal of Claim CLM-2026-04829\n\nDear Blue Shield Insurance,\n\nI am writing to appeal your denial.\n\nSincerely,\nJohn Doe";
    const result = validateAppealDraft(draft, decision, [], [], insurancePackSet);
    assert.ok(result.passed, `Should pass with all sections. Errors: ${result.errors}, Warnings: ${result.warnings}`);
  });

  test("fails when required section missing", () => {
    const decision = setupDecision();
    const draft = "I want to appeal my claim denial. Please reconsider.";
    const result = validateAppealDraft(draft, decision, [], [], insurancePackSet);
    assert.ok(result.errors > 0, "Should have errors for missing sections");
  });
});

describe("Draft Validation — Empty Draft", () => {
  test("blocks on empty draft", () => {
    const decision = setupDecision();
    const result = validateAppealDraft("", decision, [], [], insurancePackSet);
    assert.ok(result.blocks > 0, "Empty draft should produce a block");
    assert.ok(!result.passed, "Empty draft should not pass");
  });

  test("blocks on very short draft", () => {
    const decision = setupDecision();
    const result = validateAppealDraft("Too short.", decision, [], [], insurancePackSet);
    assert.ok(result.blocks > 0, "Very short draft should produce a block");
  });
});

describe("Draft Validation — Unsupported Amounts", () => {
  test("flags amounts not in extracted facts", () => {
    const decision = setupDecision();
    const draft = "Dear Blue Shield,\n\nRe: Appeal CLM-2026-04829\n\nI am appealing the denial. The actual cost was $999,999.99.\n\nSincerely,\nJohn";
    const result = validateAppealDraft(draft, decision, [], [], insurancePackSet);
    const amountFindings = result.findings.filter(f => f.check.startsWith("unsupported_amount"));
    assert.ok(amountFindings.length > 0, "Should flag unsupported amount $999,999.99");
  });
});

describe("Draft Validation — Forbidden Claims", () => {
  test("flags guaranteed outcome language", () => {
    const decision = setupDecision();
    const draft = "Dear Blue Shield,\n\nRe: Appeal CLM-2026-04829\n\nThis appeal is guaranteed to result in approval.\n\nSincerely,\nJohn";
    const result = validateAppealDraft(draft, decision, [], [], insurancePackSet);
    const forbiddenFindings = result.findings.filter(f => f.check.startsWith("prohibited_claim"));
    assert.ok(forbiddenFindings.length > 0, "Should flag guaranteed outcome");
  });
});

describe("Draft Validation — Placeholders", () => {
  test("flags unresolved placeholders", () => {
    const decision = setupDecision();
    const draft = "Dear Blue Shield,\n\nRe: Appeal CLM-2026-04829\n\n[YOUR NAME] is appealing the denial.\n\nSincerely,\n[SIGNATURE]";
    const result = validateAppealDraft(draft, decision, [], [], insurancePackSet);
    const placeholderFindings = result.findings.filter(f => f.check.startsWith("placeholder"));
    assert.ok(placeholderFindings.length > 0, "Should flag unresolved placeholders");
  });
});

describe("Draft Validation — Unsupported Grounds", () => {
  test("flags grounds with no evidence appearing in draft", () => {
    const decision = setupDecision();
    const ground = createGround("factual_error", {
      claim: "The denial incorrectly states the damage was from wear and tear",
      confidence: 0.7,
    });
    const draft = `Dear Blue Shield,\n\nRe: Appeal CLM-2026-04829\n\nThe denial incorrectly states the damage was from wear and tear. This is factually incorrect.\n\nSincerely,\nJohn`;
    const result = validateAppealDraft(draft, decision, [ground], [], insurancePackSet);
    const unsupportedFindings = result.findings.filter(f => f.check.startsWith("unsupported_ground"));
    assert.ok(unsupportedFindings.length > 0, "Should flag ground with no evidence");
  });
});

describe("Draft Validation — Requested Action", () => {
  test("warns when no requested action found", () => {
    const decision = setupDecision();
    const draft = "Dear Blue Shield,\n\nRe: Appeal CLM-2026-04829\n\nI am writing about my claim denial. Thank you for your time.\n\nSincerely,\nJohn";
    const result = validateAppealDraft(draft, decision, [], [], insurancePackSet);
    const actionFinding = result.findings.find(f => f.check === "requested_action_present");
    assert.ok(actionFinding, "Should have a requested_action_present check");
    assert.ok(!actionFinding!.passed, "Should fail when no action keyword found");
  });

  test("passes when requested action found", () => {
    const decision = setupDecision();
    const draft = "Dear Blue Shield,\n\nRe: Appeal CLM-2026-04829\n\nI request that you reconsider my claim and reverse the denial.\n\nSincerely,\nJohn";
    const result = validateAppealDraft(draft, decision, [], [], insurancePackSet);
    const actionFinding = result.findings.find(f => f.check === "requested_action_present");
    assert.ok(actionFinding?.passed, "Should pass when action keyword found");
  });
});

describe("Draft Validation — Appeal Type", () => {
  test("warns when 'appeal' not mentioned", () => {
    const decision = setupDecision();
    const draft = "Dear Blue Shield,\n\nRe: CLM-2026-04829\n\nI disagree with your decision about my claim. Please review it.\n\nSincerely,\nJohn";
    const result = validateAppealDraft(draft, decision, [], [], insurancePackSet);
    const appealFinding = result.findings.find(f => f.check === "appeal_type_mentioned");
    assert.ok(appealFinding, "Should have an appeal_type_mentioned check");
    assert.ok(!appealFinding!.passed, "Should fail when 'appeal' not in draft");
  });
});
