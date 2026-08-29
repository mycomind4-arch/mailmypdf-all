/* ═══════════════════════════════════════════════════════════
   CP523 BASIC TESTS — extraction, draft generation, warnings.

   ═══════════════════════════════════════════════════════════ */

import { test } from "node:test";
import assert from "node:assert/strict";

import { extractCP523, generateCP523Draft } from "../src/domain/cp523.ts";
import { analyzeCP523Discrepancies } from "../src/domain/cp523-discrepancy.ts";
import { buildCP523EvidenceChecklist } from "../src/domain/cp523-evidence.ts";
import { generateCP523Strategy } from "../src/domain/cp523-strategy.ts";
import { getCP523ResearchPack } from "../src/domain/cp523-research.ts";
import { validateFactualConsistency, validateCP523Draft } from "../src/domain/cp523-validation.ts";
import { createCP523Case, setCaseAnalysis, setCaseStrategy, setCaseDraft, setCaseValidation } from "../src/domain/cp523-case.ts";

import {
  FIXTURE_VALID_CP523,
  FIXTURE_CP523_NO_DEADLINE,
  FIXTURE_WRONG_DOCUMENT,
  FIXTURE_MINIMAL_CP523,
  FIXTURE_ADVERSARIAL_INJECTION,
  FIXTURE_ADVERSARIAL_EMPTY,
  FIXTURE_CP523_WITH_BALANCE_DISPUTE,
  FIXTURE_CP523_USER_FACTS_DISPUTE,
} from "./cp523-fixtures.mjs";

// ═══════════════════════════════════════════════════════════
// A. EXTRACTION
// ═══════════════════════════════════════════════════════════

test("A1: extraction succeeds on valid CP523 fixture", () => {
  const result = extractCP523(FIXTURE_VALID_CP523);
  assert.ok(result, "extraction should return a result");
  assert.ok(result.isCP523, "should identify as CP523");
  assert.ok(result.noticeNumber, "noticeNumber should be populated");
  assert.ok(result.noticeDate, "noticeDate should be populated");
  assert.ok(result.classificationConfidence > 0, "confidence should be positive");
  assert.ok(result.facts.length > 0, "facts should be non-empty");
});

test("A2: extraction populates important CP523-specific values", () => {
  const result = extractCP523(FIXTURE_VALID_CP523);
  assert.ok(result.noticeNumber?.includes("CP523"), "noticeNumber should contain CP523");
  assert.equal(result.noticeDate, "January 15, 2024");
  assert.ok(result.balanceDue, "balanceDue should be populated");
  assert.ok(result.totalDue, "totalDue should be populated");
  assert.ok(result.installmentAgreementNumber, "installmentAgreementNumber should be populated");
  assert.ok(result.defaultReason, "defaultReason should be populated");
  assert.ok(result.terminationDate, "terminationDate should be populated");
  assert.ok(result.cdpRightsNotice, "cdpRightsNotice should be true");
  assert.ok(result.passportCertification, "passportCertification should be true");
});

test("A3: extraction handles missing deadline gracefully", () => {
  const result = extractCP523(FIXTURE_CP523_NO_DEADLINE);
  assert.ok(result.isCP523);
  assert.ok(!result.responseDeadline || result.responseDeadline === null, "deadline should be null or missing");
  assert.ok(result.warnings.length > 0, "should have warnings about missing deadline");
});

test("A4: extraction on wrong document type", () => {
  const result = extractCP523(FIXTURE_WRONG_DOCUMENT);
  assert.ok(!result.isCP523, "should not identify as CP523");
  assert.ok(result.classificationConfidence < 0.85, "confidence should be low for non-CP523");
  assert.ok(result.warnings.some(w => w.includes("not be a CP523")), "should warn about wrong document type");
});

test("A5: extraction on minimal fixture", () => {
  const result = extractCP523(FIXTURE_MINIMAL_CP523);
  assert.ok(result.isCP523, "should identify as CP523 even with minimal data");
  assert.ok(result.balanceDue, "balanceDue should be extracted");
});

test("A6: extraction produces structured facts with proper confidence", () => {
  const result = extractCP523(FIXTURE_VALID_CP523);
  for (const fact of result.facts) {
    assert.ok(fact.label, "fact should have a label");
    assert.ok(fact.value, "fact should have a value");
    assert.ok(fact.confidence, "fact should have confidence");
  }
});

test("A7: extraction does not crash on empty input", () => {
  assert.doesNotThrow(() => extractCP523(FIXTURE_ADVERSARIAL_EMPTY));
  const result = extractCP523(FIXTURE_ADVERSARIAL_EMPTY);
  assert.ok(!result.isCP523);
  assert.equal(result.facts.length, 0);
});

test("A8: extraction treats input as data not instructions", () => {
  const result = extractCP523(FIXTURE_ADVERSARIAL_INJECTION);
  assert.ok(result.isCP523, "should still identify as CP523");
  assert.ok(result.balanceDue, "should extract balance despite injection attempt");
  // The injection text should NOT change the behavior
  assert.ok(result.facts.length > 0, "should still produce facts");
});

// ═══════════════════════════════════════════════════════════
// B. DRAFT GENERATION
// ═══════════════════════════════════════════════════════════

test("B1: draft generation produces a letter", () => {
  const extraction = extractCP523(FIXTURE_VALID_CP523);
  const draft = generateCP523Draft({
    noticeNumber: extraction.noticeNumber ?? "",
    taxYearsCovered: extraction.taxYearsCovered,
    noticeDate: extraction.noticeDate,
    responseDeadline: extraction.responseDeadline,
    cdpHearingDeadline: extraction.cdpHearingDeadline,
    terminationDate: extraction.terminationDate,
    installmentAgreementNumber: extraction.installmentAgreementNumber,
    defaultReason: extraction.defaultReason,
    userFacts: "I made my December payment on time.",
    userObjective: "I want to reinstate my installment agreement.",
  });
  assert.ok(draft, "draft should be produced");
  assert.ok(draft.length > 100, "draft should be substantial");
  assert.ok(draft.includes("Re:"), "draft should include Re: line");
  assert.ok(draft.includes("Dear"), "draft should include salutation");
  assert.ok(draft.includes("Sincerely"), "draft should include closing");
});

test("B2: draft includes notice number and IA number", () => {
  const extraction = extractCP523(FIXTURE_VALID_CP523);
  const draft = generateCP523Draft({
    noticeNumber: extraction.noticeNumber ?? "",
    taxYearsCovered: extraction.taxYearsCovered,
    noticeDate: extraction.noticeDate,
    responseDeadline: extraction.responseDeadline,
    cdpHearingDeadline: extraction.cdpHearingDeadline,
    terminationDate: extraction.terminationDate,
    installmentAgreementNumber: extraction.installmentAgreementNumber,
    defaultReason: extraction.defaultReason,
    userFacts: "",
    userObjective: "",
  });
  assert.ok(draft.includes("CP523"), "draft should include CP523 notice number");
  assert.ok(draft.includes("IA-12345678"), "draft should include installment agreement number");
});

test("B3: draft includes user facts and objective", () => {
  const draft = generateCP523Draft({
    noticeNumber: "CP523-2024-TEST",
    taxYearsCovered: ["2022"],
    noticeDate: "January 15, 2024",
    responseDeadline: null,
    cdpHearingDeadline: null,
    terminationDate: null,
    installmentAgreementNumber: null,
    defaultReason: null,
    userFacts: "I made all my payments on time.",
    userObjective: "I want to dispute the default.",
  });
  assert.ok(draft.includes("I made all my payments on time"), "draft should include user facts");
  assert.ok(draft.includes("I want to dispute the default"), "draft should include user objective");
});

test("B4: draft includes placeholders for missing info", () => {
  const draft = generateCP523Draft({
    noticeNumber: "CP523",
    taxYearsCovered: [],
    noticeDate: null,
    responseDeadline: null,
    cdpHearingDeadline: null,
    terminationDate: null,
    installmentAgreementNumber: null,
    defaultReason: null,
    userFacts: "",
    userObjective: "",
  });
  assert.ok(draft.includes("[NOTICE DATE]") || draft.includes("[YOUR NAME]"), "draft should have placeholders for missing info");
});

// ═══════════════════════════════════════════════════════════
// C. DISCREPANCY ANALYSIS
// ═══════════════════════════════════════════════════════════

test("C1: discrepancy analysis runs without error", () => {
  const extraction = extractCP523(FIXTURE_VALID_CP523);
  const result = analyzeCP523Discrepancies({ extraction });
  assert.ok(result, "should return a result");
  assert.ok(Array.isArray(result.discrepancies), "discrepancies should be an array");
  assert.ok(Array.isArray(result.findings), "findings should be an array");
});

test("C2: discrepancy analysis detects levy risk", () => {
  const extraction = extractCP523(FIXTURE_VALID_CP523);
  const result = analyzeCP523Discrepancies({ extraction });
  const levyFindings = result.findings.filter(f => f.type === "levy_risk");
  assert.ok(levyFindings.length > 0, "should detect levy risk from CP523");
});

test("C3: discrepancy analysis detects deadline risk when no deadline", () => {
  const extraction = extractCP523(FIXTURE_CP523_NO_DEADLINE);
  const result = analyzeCP523Discrepancies({ extraction });
  const deadlineFindings = result.findings.filter(f => f.type === "deadline_risk");
  assert.ok(deadlineFindings.length > 0, "should detect deadline risk");
});

test("C4: discrepancy analysis detects balance dispute with user facts", () => {
  const extraction = extractCP523(FIXTURE_CP523_WITH_BALANCE_DISPUTE);
  const result = analyzeCP523Discrepancies({
    extraction,
    userFacts: FIXTURE_CP523_USER_FACTS_DISPUTE,
  });
  const balanceDisputes = result.discrepancies.filter(d => d.type === "balance_dispute");
  assert.ok(balanceDisputes.length > 0, "should detect balance dispute");
  assert.ok(balanceDisputes[0].irsAmount, "should have IRS amount");
  assert.ok(balanceDisputes[0].userAmount, "should have user amount");
});

test("C5: findings have proper severity", () => {
  const extraction = extractCP523(FIXTURE_VALID_CP523);
  const result = analyzeCP523Discrepancies({ extraction });
  for (const f of result.findings) {
    assert.ok(["critical", "high", "medium", "low", "info"].includes(f.severity));
  }
});

test("C6: findings have supporting facts", () => {
  const extraction = extractCP523(FIXTURE_VALID_CP523);
  const result = analyzeCP523Discrepancies({ extraction });
  for (const f of result.findings) {
    assert.ok(f.supportingFacts.length > 0, "every finding should have at least one supporting fact");
  }
});

// ═══════════════════════════════════════════════════════════
// D. EVIDENCE CHECKLIST
// ═══════════════════════════════════════════════════════════

test("D1: evidence checklist produces items", () => {
  const extraction = extractCP523(FIXTURE_VALID_CP523);
  const discResult = analyzeCP523Discrepancies({ extraction });
  const evidenceResult = buildCP523EvidenceChecklist({
    extraction,
    discrepancies: discResult.discrepancies,
    findings: discResult.findings,
  });
  assert.ok(evidenceResult.items.length > 0, "should have evidence items");
  assert.ok(evidenceResult.requiredCount > 0, "should have required items");
});

test("D2: evidence checklist includes installment agreement and payment records", () => {
  const extraction = extractCP523(FIXTURE_VALID_CP523);
  const discResult = analyzeCP523Discrepancies({ extraction });
  const evidenceResult = buildCP523EvidenceChecklist({
    extraction,
    discrepancies: discResult.discrepancies,
    findings: discResult.findings,
  });
  const hasIA = evidenceResult.items.some(i => i.type === "installment_agreement");
  const hasPaymentRecords = evidenceResult.items.some(i => i.type === "payment_records");
  assert.ok(hasIA, "should include installment agreement documentation");
  assert.ok(hasPaymentRecords, "should include payment records");
});

test("D3: evidence checklist includes CDP request when CDP rights detected", () => {
  const extraction = extractCP523(FIXTURE_VALID_CP523);
  assert.ok(extraction.cdpRightsNotice, "fixture should have CDP rights");
  const discResult = analyzeCP523Discrepancies({ extraction });
  const evidenceResult = buildCP523EvidenceChecklist({
    extraction,
    discrepancies: discResult.discrepancies,
    findings: discResult.findings,
  });
  const hasCDP = evidenceResult.items.some(i => i.type === "cdp_request");
  assert.ok(hasCDP, "should include CDP request form when CDP rights detected");
});

// ═══════════════════════════════════════════════════════════
// E. STRATEGY
// ═══════════════════════════════════════════════════════════

test("E1: strategy generation produces structured result", () => {
  const extraction = extractCP523(FIXTURE_VALID_CP523);
  const discResult = analyzeCP523Discrepancies({ extraction });
  const evidenceResult = buildCP523EvidenceChecklist({
    extraction,
    discrepancies: discResult.discrepancies,
    findings: discResult.findings,
  });
  const strategy = generateCP523Strategy({
    discrepancies: discResult.discrepancies,
    findings: discResult.findings,
    evidence: evidenceResult.items,
    userFacts: "I want to reinstate my agreement",
    userObjective: "reinstate",
    hasDeadline: true,
    extractionConfident: true,
    cdpRightsNotice: true,
  });
  assert.ok(strategy, "strategy should be produced");
  assert.ok(strategy.position, "should have a position");
  assert.ok(Array.isArray(strategy.requestedActions), "should have requested actions");
  assert.ok(Array.isArray(strategy.riskFlags), "should have risk flags");
  assert.ok(["high", "medium", "low"].includes(strategy.confidence), "should have valid confidence");
});

test("E2: strategy selects reinstate_agreement when user requests reinstatement", () => {
  const extraction = extractCP523(FIXTURE_VALID_CP523);
  const discResult = analyzeCP523Discrepancies({ extraction });
  const evidenceResult = buildCP523EvidenceChecklist({
    extraction,
    discrepancies: discResult.discrepancies,
    findings: discResult.findings,
  });
  const strategy = generateCP523Strategy({
    discrepancies: discResult.discrepancies,
    findings: discResult.findings,
    evidence: evidenceResult.items,
    userFacts: null,
    userObjective: "I want to reinstate my installment agreement",
    hasDeadline: true,
    extractionConfident: true,
    cdpRightsNotice: true,
  });
  assert.equal(strategy.position, "reinstate_agreement");
});

test("E3: strategy selects request_cdp_hearing when user requests hearing", () => {
  const extraction = extractCP523(FIXTURE_VALID_CP523);
  const discResult = analyzeCP523Discrepancies({ extraction });
  const evidenceResult = buildCP523EvidenceChecklist({
    extraction,
    discrepancies: discResult.discrepancies,
    findings: discResult.findings,
  });
  const strategy = generateCP523Strategy({
    discrepancies: discResult.discrepancies,
    findings: discResult.findings,
    evidence: evidenceResult.items,
    userFacts: null,
    userObjective: "I want a CDP hearing",
    hasDeadline: true,
    extractionConfident: true,
    cdpRightsNotice: true,
  });
  assert.equal(strategy.position, "request_cdp_hearing");
});

test("E4: strategy returns insufficient_info for low confidence", () => {
  const extraction = extractCP523(FIXTURE_WRONG_DOCUMENT);
  const discResult = analyzeCP523Discrepancies({ extraction });
  const evidenceResult = buildCP523EvidenceChecklist({
    extraction,
    discrepancies: discResult.discrepancies,
    findings: discResult.findings,
  });
  const strategy = generateCP523Strategy({
    discrepancies: discResult.discrepancies,
    findings: discResult.findings,
    evidence: evidenceResult.items,
    userFacts: null,
    userObjective: null,
    hasDeadline: false,
    extractionConfident: false,
    cdpRightsNotice: false,
  });
  assert.equal(strategy.position, "insufficient_info");
});

// ═══════════════════════════════════════════════════════════
// F. RESEARCH PACK
// ═══════════════════════════════════════════════════════════

test("F1: research pack has authoritative sources", () => {
  const pack = getCP523ResearchPack();
  assert.ok(pack.sources.length > 0, "should have sources");
  assert.ok(pack.sources.length >= 5, "should have at least 5 sources");
});

test("F2: research pack includes IRS CP523 page", () => {
  const pack = getCP523ResearchPack();
  const cp523Source = pack.sources.find(s => s.url.includes("cp523"));
  assert.ok(cp523Source, "should include the IRS CP523 page");
});

test("F3: research pack includes Publication 1660", () => {
  const pack = getCP523ResearchPack();
  const pub1660 = pack.sources.find(s => s.title.includes("1660"));
  assert.ok(pub1660, "should include Publication 1660");
});

test("F4: research pack known facts are source statements", () => {
  const pack = getCP523ResearchPack();
  assert.ok(pack.knownFacts.length > 0, "should have known facts");
  const sourceStatements = pack.knownFacts.filter(f => f.isSourceStatement);
  assert.ok(sourceStatements.length > 0, "should have source statements");
});

test("F5: research pack sources are verified", () => {
  const pack = getCP523ResearchPack();
  for (const s of pack.sources) {
    assert.equal(s.verificationStatus, "verified", `source ${s.title} should be verified`);
  }
});

// ═══════════════════════════════════════════════════════════
// G. VALIDATION
// ═══════════════════════════════════════════════════════════

test("G1: factual validation runs without error", () => {
  const extraction = extractCP523(FIXTURE_VALID_CP523);
  const discResult = analyzeCP523Discrepancies({ extraction });
  const draft = "Re: CP523-2024-567890-A Tax Year 2022 Dear Sir or Madam: Sincerely, [YOUR NAME]";
  const findings = validateFactualConsistency(draft, extraction, discResult.discrepancies, null);
  assert.ok(Array.isArray(findings), "should return findings array");
});

test("G2: factual validation flags missing notice number", () => {
  const extraction = extractCP523(FIXTURE_VALID_CP523);
  const discResult = analyzeCP523Discrepancies({ extraction });
  const draft = "Dear Sir or Madam: This is my response. Sincerely, [YOUR NAME]";
  const findings = validateFactualConsistency(draft, extraction, discResult.discrepancies, null);
  const noticeCheck = findings.find(f => f.check === "notice_number_present");
  assert.ok(noticeCheck, "should have a notice number check");
  assert.equal(noticeCheck.passed, false, "should flag missing notice number");
});

test("G3: factual validation flags placeholders", () => {
  const extraction = extractCP523(FIXTURE_VALID_CP523);
  const discResult = analyzeCP523Discrepancies({ extraction });
  const draft = "Re: CP523-2024-567890-A Dear Sir or Madam: [YOUR NAME] Sincerely, [YOUR NAME]";
  const findings = validateFactualConsistency(draft, extraction, discResult.discrepancies, null);
  const placeholderFindings = findings.filter(f => f.check.startsWith("placeholder:"));
  assert.ok(placeholderFindings.length > 0, "should flag placeholders");
  for (const f of placeholderFindings) {
    assert.equal(f.passed, false, "placeholder check should fail");
  }
});

test("G4: factual validation flags forbidden claims", () => {
  const extraction = extractCP523(FIXTURE_VALID_CP523);
  const discResult = analyzeCP523Discrepancies({ extraction });
  const draft = "Re: CP523 This is guaranteed to result in dismissal. Dear Sir or Madam: Sincerely, Name";
  const findings = validateFactualConsistency(draft, extraction, discResult.discrepancies, null);
  const forbiddenFindings = findings.filter(f => f.check.startsWith("forbidden_claim:"));
  assert.ok(forbiddenFindings.length > 0, "should flag forbidden claims");
});

// ═══════════════════════════════════════════════════════════
// H. CASE MODEL
// ═══════════════════════════════════════════════════════════

test("H1: case model initializes from extraction", () => {
  const extraction = extractCP523(FIXTURE_VALID_CP523);
  const case_ = createCP523Case(extraction);
  assert.ok(case_.id, "case should have an id");
  assert.ok(case_.version === 1, "case should start at version 1");
  assert.equal(case_.phase, "extraction");
  assert.equal(case_.maturity, "functional");
  assert.ok(case_.notice.extraction, "case should have extraction");
  assert.ok(case_.installmentAgreement.number, "case should have IA number");
  assert.ok(case_.installmentAgreement.defaultReason, "case should have default reason");
});

test("H2: case model updates with analysis", () => {
  const extraction = extractCP523(FIXTURE_VALID_CP523);
  let case_ = createCP523Case(extraction);
  const discResult = analyzeCP523Discrepancies({ extraction });
  const evidenceResult = buildCP523EvidenceChecklist({
    extraction,
    discrepancies: discResult.discrepancies,
    findings: discResult.findings,
  });
  case_ = setCaseAnalysis(case_, {
    discrepancies: discResult.discrepancies,
    findings: discResult.findings,
    evidence: evidenceResult.items,
  });
  assert.equal(case_.phase, "analysis");
  assert.ok(case_.discrepancies.length > 0, "case should have discrepancies");
  assert.ok(case_.findings.length > 0, "case should have findings");
  assert.ok(case_.evidence.length > 0, "case should have evidence");
});

test("H3: case model updates with strategy", () => {
  const extraction = extractCP523(FIXTURE_VALID_CP523);
  let case_ = createCP523Case(extraction);
  const discResult = analyzeCP523Discrepancies({ extraction });
  const evidenceResult = buildCP523EvidenceChecklist({
    extraction,
    discrepancies: discResult.discrepancies,
    findings: discResult.findings,
  });
  const strategy = generateCP523Strategy({
    discrepancies: discResult.discrepancies,
    findings: discResult.findings,
    evidence: evidenceResult.items,
    userFacts: null,
    userObjective: "reinstate",
    hasDeadline: true,
    extractionConfident: true,
    cdpRightsNotice: true,
  });
  case_ = setCaseStrategy(case_, strategy);
  assert.equal(case_.phase, "strategy");
  assert.ok(case_.strategy, "case should have strategy");
});
