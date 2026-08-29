import assert from "node:assert/strict";
import test from "node:test";

import { extractCP2000 } from "../src/domain/cp2000.ts";
import { classifyNoticeType } from "../src/domain/notice-type.ts";
import { createCP2000Case, setCaseAnalysis, setCaseStrategy, setCaseDraft, setCaseValidation, setCaseUserInput } from "../src/domain/cp2000-case.ts";
import { analyzeCP2000Discrepancies } from "../src/domain/cp2000-discrepancy.ts";
import { buildCP2000EvidenceChecklist } from "../src/domain/cp2000-evidence.ts";
import { generateCP2000Strategy, STRATEGY_POSITION_LABELS } from "../src/domain/cp2000-strategy.ts";
import { validateCP2000Draft, validateFactualConsistency, validateRequirementCompleteness } from "../src/domain/cp2000-validation.ts";
import { getCP2000ResearchPack, CP2000_KNOWN_FACTS } from "../src/domain/cp2000-research.ts";
import { findingSummary, createFinding } from "../src/domain/cp2000-findings.ts";
import { cp2000PackSet } from "../src/domain/cp2000-packs.ts";
import { getDomainPack } from "../src/domain/domain-packs.ts";

import {
  FIXTURE_VALID_SIMPLE,
  FIXTURE_MULTIPLE_DISCREPANCIES,
  FIXTURE_MISSING_EVIDENCE,
  FIXTURE_AMBIGUOUS,
  FIXTURE_CONFLICTING_USER,
  FIXTURE_CONFLICTING_USER_FACTS,
  FIXTURE_INCOMPLETE,
  FIXTURE_WRONG_DOCUMENT,
  FIXTURE_MISSING_DEADLINE,
  FIXTURE_VALID_FOR_DRAFT_TEST,
  FIXTURE_DRAFT_WITH_UNSUPPORTED_CLAIM,
  FIXTURE_DRAFT_VALID,
  FIXTURE_ADVERSARIAL_EMPTY,
  FIXTURE_ADVERSARIAL_GIBBERISH,
  FIXTURE_ADVERSARIAL_INJECTION,
} from "./cp2000-fixtures.mjs";

// ═══════════════════════════════════════════════════════════════
// STEP 2C: Document Classification
// ═══════════════════════════════════════════════════════════════

test("Classification: valid CP2000 is classified as irs_cp2000", () => {
  const result = classifyNoticeType(FIXTURE_VALID_SIMPLE);
  assert.equal(result.type, "irs_cp2000");
  assert.ok(result.confidence > 0.7, `Confidence too low: ${result.confidence}`);
});

test("Classification: wrong document is NOT classified as irs_cp2000", () => {
  const result = classifyNoticeType(FIXTURE_WRONG_DOCUMENT);
  assert.notEqual(result.type, "irs_cp2000");
  assert.equal(result.type, "court_summons");
});

test("Classification: empty text returns 'other' with low confidence", () => {
  const result = classifyNoticeType(FIXTURE_ADVERSARIAL_EMPTY);
  assert.equal(result.type, "other");
  assert.ok(result.confidence < 0.3);
});

test("Classification: gibberish returns 'other'", () => {
  const result = classifyNoticeType(FIXTURE_ADVERSARIAL_GIBBERISH);
  assert.equal(result.type, "other");
});

test("Classification: injection attempt does not break classifier", () => {
  const result = classifyNoticeType(FIXTURE_ADVERSARIAL_INJECTION);
  // Should classify or return 'other', but not crash
  assert.ok(["irs_cp2000", "other", "irs_letter"].includes(result.type));
});

// ═══════════════════════════════════════════════════════════════
// STEP 2D: Extraction & Fact Model
// ═══════════════════════════════════════════════════════════════

test("Extraction: valid CP2000 extracts notice number", () => {
  const result = extractCP2000(FIXTURE_VALID_SIMPLE);
  assert.ok(result.isCP2000);
  assert.ok(result.noticeNumber);
  assert.ok(result.noticeNumber.includes("CP2000"));
});

test("Extraction: valid CP2000 extracts tax year", () => {
  const result = extractCP2000(FIXTURE_VALID_SIMPLE);
  assert.equal(result.taxYear, "2023");
});

test("Extraction: valid CP2000 extracts income amounts", () => {
  const result = extractCP2000(FIXTURE_VALID_SIMPLE);
  assert.ok(result.reportedIncome);
  assert.ok(result.irsReportedIncome);
  assert.ok(result.reportedIncome.includes("45,000"));
  assert.ok(result.irsReportedIncome.includes("52,000"));
});

test("Extraction: valid CP2000 extracts proposed tax increase", () => {
  const result = extractCP2000(FIXTURE_VALID_SIMPLE);
  assert.ok(result.proposedTaxIncrease);
  assert.ok(result.proposedTaxIncrease.includes("1,200"));
});

test("Extraction: valid CP2000 extracts response deadline", () => {
  const result = extractCP2000(FIXTURE_VALID_SIMPLE);
  assert.ok(result.responseDeadline);
  assert.ok(result.responseDeadline.includes("May 14, 2024"));
});

test("Extraction: facts have provenance (sourceExcerpt, extractionMethod)", () => {
  const result = extractCP2000(FIXTURE_VALID_SIMPLE);
  assert.ok(result.facts.length > 0);
  for (const fact of result.facts) {
    assert.ok(fact.sourceExcerpt, `Fact ${fact.label} missing sourceExcerpt`);
    assert.equal(fact.extractionMethod, "pattern_match");
  }
});

test("Extraction: incomplete notice produces warnings", () => {
  const result = extractCP2000(FIXTURE_INCOMPLETE);
  assert.ok(result.warnings.length > 0, "Should have warnings for incomplete notice");
});

test("Extraction: wrong document is not classified as CP2000", () => {
  const result = extractCP2000(FIXTURE_WRONG_DOCUMENT);
  assert.equal(result.isCP2000, false);
  assert.notEqual(result.classificationConfidence, undefined);
});

// ═══════════════════════════════════════════════════════════════
// STEP 2E: Deadline Engine
// ═══════════════════════════════════════════════════════════════

test("Deadline: confirmed when explicitly stated", () => {
  const extraction = extractCP2000(FIXTURE_VALID_SIMPLE);
  const case_ = createCP2000Case(extraction);
  assert.equal(case_.deadline.certainty, "confirmed");
  assert.ok(case_.deadline.parsed);
  assert.ok(case_.deadline.parsed.includes("May 14, 2024"));
});

test("Deadline: missing when not in notice", () => {
  const extraction = extractCP2000(FIXTURE_MISSING_DEADLINE);
  const case_ = createCP2000Case(extraction);
  assert.equal(case_.deadline.certainty, "missing");
  assert.equal(case_.deadline.parsed, null);
});

test("Deadline: source is documented", () => {
  const extraction = extractCP2000(FIXTURE_VALID_SIMPLE);
  const case_ = createCP2000Case(extraction);
  assert.ok(case_.deadline.source.includes("Extracted from notice text"));
});

test("Deadline: never fabricated", () => {
  const extraction = extractCP2000(FIXTURE_INCOMPLETE);
  const case_ = createCP2000Case(extraction);
  // When no deadline is found, it should be null, not a fabricated date
  if (!extraction.responseDeadline) {
    assert.equal(case_.deadline.parsed, null);
    assert.equal(case_.deadline.certainty, "missing");
  }
});

// ═══════════════════════════════════════════════════════════════
// STEP 2F+2G: Notice Analysis & Discrepancy Analysis
// ═══════════════════════════════════════════════════════════════

test("Discrepancy: amount mismatch detected for valid CP2000", () => {
  const extraction = extractCP2000(FIXTURE_VALID_SIMPLE);
  const result = analyzeCP2000Discrepancies({ extraction });
  assert.ok(result.discrepancies.length > 0, "Should detect discrepancies");
  const amountMismatch = result.discrepancies.find((d) => d.type === "amount_mismatch");
  assert.ok(amountMismatch, "Should detect amount_mismatch");
  assert.ok(amountMismatch.irsAmount);
  assert.ok(amountMismatch.userAmount);
  assert.ok(amountMismatch.difference);
});

test("Discrepancy: findings are traceable to facts", () => {
  const extraction = extractCP2000(FIXTURE_VALID_SIMPLE);
  const result = analyzeCP2000Discrepancies({ extraction });
  for (const finding of result.findings) {
    assert.ok(finding.supportingFacts.length > 0,
      `Finding "${finding.statement}" has no supporting facts`);
  }
});

test("Discrepancy: missing deadline generates finding", () => {
  const extraction = extractCP2000(FIXTURE_MISSING_DEADLINE);
  const result = analyzeCP2000Discrepancies({ extraction });
  const deadlineFinding = result.findings.find((f) => f.type === "deadline_risk");
  assert.ok(deadlineFinding, "Should generate deadline_risk finding");
  assert.ok(deadlineFinding.severity === "high");
});

test("Discrepancy: proposed tax increase generates finding", () => {
  const extraction = extractCP2000(FIXTURE_VALID_SIMPLE);
  const result = analyzeCP2000Discrepancies({ extraction });
  const taxFinding = result.findings.find((f) => f.type === "proposed_change");
  assert.ok(taxFinding, "Should generate proposed_change finding");
});

test("Discrepancy: non-CP2000 document generates classification warning", () => {
  const extraction = extractCP2000(FIXTURE_WRONG_DOCUMENT);
  const result = analyzeCP2000Discrepancies({ extraction });
  const warning = result.findings.find((f) => f.type === "classification_warning");
  assert.ok(warning, "Should generate classification_warning for wrong document");
});

test("Discrepancy: status is 'unresolved' for new discrepancies", () => {
  const extraction = extractCP2000(FIXTURE_VALID_SIMPLE);
  const result = analyzeCP2000Discrepancies({ extraction });
  for (const d of result.discrepancies) {
    assert.equal(d.status, "unresolved");
  }
});

test("Discrepancy: evidence needed is listed for each discrepancy", () => {
  const extraction = extractCP2000(FIXTURE_VALID_SIMPLE);
  const result = analyzeCP2000Discrepancies({ extraction });
  for (const d of result.discrepancies) {
    assert.ok(d.evidenceNeeded.length > 0,
      `Discrepancy ${d.type} has no evidenceNeeded`);
  }
});

test("Discrepancy: possible explanations provided", () => {
  const extraction = extractCP2000(FIXTURE_VALID_SIMPLE);
  const result = analyzeCP2000Discrepancies({ extraction });
  for (const d of result.discrepancies) {
    assert.ok(d.possibleExplanations.length > 0,
      `Discrepancy ${d.type} has no possibleExplanations`);
  }
});

// ═══════════════════════════════════════════════════════════════
// STEP 2H: Evidence Engine
// ═══════════════════════════════════════════════════════════════

test("Evidence: checklist generated from discrepancies", () => {
  const extraction = extractCP2000(FIXTURE_VALID_SIMPLE);
  const analysis = analyzeCP2000Discrepancies({ extraction });
  const checklist = buildCP2000EvidenceChecklist({
    extraction,
    discrepancies: analysis.discrepancies,
    findings: analysis.findings,
  });
  assert.ok(checklist.items.length > 0, "Should have evidence items");
  assert.ok(checklist.requiredCount > 0, "Should have required items");
});

test("Evidence: CP2000 notice is always required and provided", () => {
  const extraction = extractCP2000(FIXTURE_VALID_SIMPLE);
  const analysis = analyzeCP2000Discrepancies({ extraction });
  const checklist = buildCP2000EvidenceChecklist({
    extraction,
    discrepancies: analysis.discrepancies,
    findings: analysis.findings,
  });
  const noticeItem = checklist.items.find((i) => i.type === "cp2000_notice");
  assert.ok(noticeItem, "Should have CP2000 notice as evidence item");
  assert.equal(noticeItem.requirement, "required");
  assert.equal(noticeItem.state, "provided");
});

test("Evidence: tax return included when tax year is present", () => {
  const extraction = extractCP2000(FIXTURE_VALID_SIMPLE);
  const analysis = analyzeCP2000Discrepancies({ extraction });
  const checklist = buildCP2000EvidenceChecklist({
    extraction,
    discrepancies: analysis.discrepancies,
    findings: analysis.findings,
  });
  const taxReturn = checklist.items.find((i) => i.type === "tax_return");
  assert.ok(taxReturn, "Should include tax return as evidence");
  assert.equal(taxReturn.requirement, "required");
});

test("Evidence: information return included when source is W-2 or 1099", () => {
  const extraction = extractCP2000(FIXTURE_VALID_SIMPLE);
  const analysis = analyzeCP2000Discrepancies({ extraction });
  const checklist = buildCP2000EvidenceChecklist({
    extraction,
    discrepancies: analysis.discrepancies,
    findings: analysis.findings,
  });
  const infoReturn = checklist.items.find((i) => i.type === "information_return");
  assert.ok(infoReturn, "Should include information return as evidence");
});

test("Evidence: items link to findings via supportsFindings", () => {
  const extraction = extractCP2000(FIXTURE_VALID_SIMPLE);
  const analysis = analyzeCP2000Discrepancies({ extraction });
  const checklist = buildCP2000EvidenceChecklist({
    extraction,
    discrepancies: analysis.discrepancies,
    findings: analysis.findings,
  });
  const noticeItem = checklist.items.find((i) => i.type === "cp2000_notice");
  assert.ok(noticeItem.supportsFindings.length > 0,
    "Notice evidence should link to findings");
});

// ═══════════════════════════════════════════════════════════════
// STEP 2I: Research Pack
// ═══════════════════════════════════════════════════════════════

test("Research: CP2000 sources are real IRS URLs", () => {
  const pack = getCP2000ResearchPack();
  assert.ok(pack.sources.length > 0);
  for (const source of pack.sources) {
    assert.ok(source.url.includes("irs.gov"),
      `Source "${source.title}" has non-IRS URL: ${source.url}`);
    assert.ok(source.title);
    assert.ok(source.covers.length > 0);
  }
});

test("Research: known facts separate source statements from interpretations", () => {
  const pack = getCP2000ResearchPack();
  for (const fact of pack.knownFacts) {
    assert.ok(fact.fact);
    assert.ok(fact.interpretation);
    assert.equal(typeof fact.isSourceStatement, "boolean");
  }
});

test("Research: no fabricated citations — all sources point to irs.gov", () => {
  const pack = getCP2000ResearchPack();
  for (const source of pack.sources) {
    assert.ok(source.url.includes("irs.gov"), `Non-IRS source: ${source.url}`);
  }
});

// ═══════════════════════════════════════════════════════════════
// STEP 2J: Response Strategy
// ═══════════════════════════════════════════════════════════════

test("Strategy: disagree_some when discrepancies found with evidence available", () => {
  const extraction = extractCP2000(FIXTURE_VALID_SIMPLE);
  const analysis = analyzeCP2000Discrepancies({ extraction });
  const checklist = buildCP2000EvidenceChecklist({
    extraction,
    discrepancies: analysis.discrepancies,
    findings: analysis.findings,
  });
  const strategy = generateCP2000Strategy({
    discrepancies: analysis.discrepancies,
    findings: analysis.findings,
    evidence: checklist.items,
    hasDeadline: !!extraction.responseDeadline,
    extractionConfident: extraction.isCP2000,
  });
  assert.ok(["disagree_some", "insufficient_info"].includes(strategy.position));
  if (strategy.position === "disagree_some") {
    assert.ok(strategy.issues.length > 0, "disagree_some should have issues");
    assert.ok(strategy.evidenceToInclude.length > 0, "disagree_some should have evidence to include");
  }
});

test("Strategy: insufficient_info when extraction is not confident", () => {
  const extraction = extractCP2000(FIXTURE_WRONG_DOCUMENT);
  const analysis = analyzeCP2000Discrepancies({ extraction });
  const strategy = generateCP2000Strategy({
    discrepancies: analysis.discrepancies,
    findings: analysis.findings,
    evidence: [],
    hasDeadline: false,
    extractionConfident: extraction.isCP2000,
  });
  assert.equal(strategy.position, "insufficient_info");
  assert.ok(strategy.riskFlags.length > 0);
});

test("Strategy: deadline risk flag when no deadline", () => {
  const extraction = extractCP2000(FIXTURE_MISSING_DEADLINE);
  const analysis = analyzeCP2000Discrepancies({ extraction });
  const strategy = generateCP2000Strategy({
    discrepancies: analysis.discrepancies,
    findings: analysis.findings,
    evidence: [],
    hasDeadline: false,
    extractionConfident: extraction.isCP2000,
  });
  assert.ok(strategy.riskFlags.some((r) => r.includes("deadline")),
    "Should flag deadline risk");
});

test("Strategy: never automatically claims user is right", () => {
  const extraction = extractCP2000(FIXTURE_VALID_SIMPLE);
  const analysis = analyzeCP2000Discrepancies({ extraction });
  const strategy = generateCP2000Strategy({
    discrepancies: analysis.discrepancies,
    findings: analysis.findings,
    evidence: [],
    hasDeadline: true,
    extractionConfident: true,
  });
  // Strategy should not claim the user is right
  assert.ok(!strategy.issues.some((i) => i.toLowerCase().includes("you are right")));
  assert.ok(!strategy.issues.some((i) => i.toLowerCase().includes("correct")));
});

// ═══════════════════════════════════════════════════════════════
// STEP 2L: Two-Pass Validation
// ═══════════════════════════════════════════════════════════════

test("Validation: valid draft passes both validators", () => {
  const extraction = extractCP2000(FIXTURE_VALID_FOR_DRAFT_TEST);
  const analysis = analyzeCP2000Discrepancies({ extraction });
  const checklist = buildCP2000EvidenceChecklist({
    extraction,
    discrepancies: analysis.discrepancies,
    findings: analysis.findings,
  });
  const strategy = generateCP2000Strategy({
    discrepancies: analysis.discrepancies,
    findings: analysis.findings,
    evidence: checklist.items,
    hasDeadline: true,
    extractionConfident: true,
  });
  let case_ = createCP2000Case(extraction);
  case_ = setCaseAnalysis(case_, {
    discrepancies: analysis.discrepancies,
    findings: analysis.findings,
    evidence: checklist.items,
  });
  case_ = setCaseStrategy(case_, strategy);
  case_ = setCaseDraft(case_, { content: FIXTURE_DRAFT_VALID, wordCount: 100, unresolvedPlaceholders: [] });
  case_ = setCaseUserInput(case_, null, null);
  const validation = validateCP2000Draft(case_);
  assert.equal(validation.errors, 0, `Should have 0 errors, got ${validation.errors}`);
});

test("Validation: draft with unsupported claims is flagged", () => {
  const extraction = extractCP2000(FIXTURE_VALID_FOR_DRAFT_TEST);
  const analysis = analyzeCP2000Discrepancies({ extraction });
  let case_ = createCP2000Case(extraction);
  case_ = setCaseAnalysis(case_, {
    discrepancies: analysis.discrepancies,
    findings: analysis.findings,
    evidence: [],
  });
  case_ = setCaseDraft(case_, { content: FIXTURE_DRAFT_WITH_UNSUPPORTED_CLAIM, wordCount: 100, unresolvedPlaceholders: [] });
  const validation = validateCP2000Draft(case_);
  // Should flag forbidden claims and placeholders
  assert.ok(validation.allFindings.some((f) => f.check.includes("forbidden_claim") && !f.passed),
    "Should flag forbidden claims");
  // Placeholders with spaces ([LIST ENCLOSED DOCUMENTS]) or without ([YOUR NAME])
  assert.ok(validation.allFindings.some((f) => 
    (f.check.includes("placeholder") || f.check.includes("unsupported_amount") || f.check.includes("forbidden_claim")) && !f.passed),
    "Should flag placeholders, unsupported amounts, or forbidden claims");
});

test("Validation: empty draft fails", () => {
  const extraction = extractCP2000(FIXTURE_VALID_SIMPLE);
  let case_ = createCP2000Case(extraction);
  case_ = setCaseDraft(case_, { content: "", wordCount: 0, unresolvedPlaceholders: [] });
  const validation = validateCP2000Draft(case_);
  assert.ok(validation.errors > 0, "Empty draft should have errors");
});

test("Validation: factual and requirement validators are separate", () => {
  const extraction = extractCP2000(FIXTURE_VALID_FOR_DRAFT_TEST);
  let case_ = createCP2000Case(extraction);
  const analysis = analyzeCP2000Discrepancies({ extraction });
  case_ = setCaseAnalysis(case_, {
    discrepancies: analysis.discrepancies,
    findings: analysis.findings,
    evidence: [],
  });
  case_ = setCaseDraft(case_, { content: FIXTURE_DRAFT_VALID, wordCount: 100, unresolvedPlaceholders: [] });
  const validation = validateCP2000Draft(case_);
  assert.ok(validation.factualFindings.length > 0, "Should have factual findings");
  assert.ok(validation.requirementFindings.length > 0, "Should have requirement findings");
  // Verify they are labeled correctly
  for (const f of validation.factualFindings) {
    assert.equal(f.validator, "factual");
  }
  for (const f of validation.requirementFindings) {
    assert.equal(f.validator, "requirement");
  }
});

// ═══════════════════════════════════════════════════════════════
// STEP 2B: Domain Pack Registration
// ═══════════════════════════════════════════════════════════════

test("Domain Pack: CP2000 pack is registered", () => {
  const pack = getDomainPack("cp2000-response");
  assert.ok(pack, "CP2000 domain pack should be registered");
  assert.equal(pack.engine, "document-action");
});

test("Domain Pack: has all 8 pack types", () => {
  const pack = getDomainPack("cp2000-response");
  assert.ok(pack.document);
  assert.ok(pack.deadline);
  assert.ok(pack.evidence);
  assert.ok(pack.research);
  assert.ok(pack.analysis);
  assert.ok(pack.draft);
  assert.ok(pack.validation);
  assert.ok(pack.submission);
});

test("Domain Pack: deadline pack says never fabricate", () => {
  const pack = getDomainPack("cp2000-response");
  assert.ok(pack.deadline.computationRules.some((r) => r.toLowerCase().includes("never fabricate")),
    "Deadline pack should say never fabricate");
});

test("Domain Pack: submission pack supports mailing and tracking", () => {
  const pack = getDomainPack("cp2000-response");
  assert.equal(pack.submission.supportsMailing, true);
  assert.equal(pack.submission.supportsTracking, true);
});

// ═══════════════════════════════════════════════════════════════
// STEP 2D: Case Model
// ═══════════════════════════════════════════════════════════════

test("Case: createCP2000Case initializes all fields", () => {
  const extraction = extractCP2000(FIXTURE_VALID_SIMPLE);
  const case_ = createCP2000Case(extraction);
  assert.ok(case_.id);
  assert.equal(case_.version, 1);
  assert.equal(case_.phase, "extraction");
  assert.equal(case_.maturity, "functional");
  assert.ok(case_.notice.extraction);
  assert.ok(case_.notice.facts.length > 0);
  assert.ok(case_.deadline);
  assert.equal(case_.discrepancies.length, 0);
  assert.equal(case_.findings.length, 0);
  assert.equal(case_.evidence.length, 0);
  assert.equal(case_.strategy, null);
  assert.equal(case_.draft, null);
  assert.equal(case_.validation, null);
  assert.equal(case_.submission.status, "not_started");
});

test("Case: phase transitions through analysis → strategy → draft → validation", () => {
  const extraction = extractCP2000(FIXTURE_VALID_SIMPLE);
  const analysis = analyzeCP2000Discrepancies({ extraction });
  const checklist = buildCP2000EvidenceChecklist({
    extraction,
    discrepancies: analysis.discrepancies,
    findings: analysis.findings,
  });
  const strategy = generateCP2000Strategy({
    discrepancies: analysis.discrepancies,
    findings: analysis.findings,
    evidence: checklist.items,
    hasDeadline: true,
    extractionConfident: true,
  });

  let case_ = createCP2000Case(extraction);
  assert.equal(case_.phase, "extraction");

  case_ = setCaseAnalysis(case_, {
    discrepancies: analysis.discrepancies,
    findings: analysis.findings,
    evidence: checklist.items,
  });
  assert.equal(case_.phase, "analysis");

  case_ = setCaseStrategy(case_, strategy);
  assert.equal(case_.phase, "strategy");

  case_ = setCaseDraft(case_, { content: FIXTURE_DRAFT_VALID, wordCount: 100, unresolvedPlaceholders: [] });
  assert.equal(case_.phase, "drafting");
});

// ═══════════════════════════════════════════════════════════════
// Adversarial Tests
// ═══════════════════════════════════════════════════════════════

test("Adversarial: empty input does not crash extraction", () => {
  const result = extractCP2000(FIXTURE_ADVERSARIAL_EMPTY);
  assert.equal(result.isCP2000, false);
  assert.equal(result.facts.length, 0);
});

test("Adversarial: injection attempt does not crash", () => {
  const result = extractCP2000(FIXTURE_ADVERSARIAL_INJECTION);
  assert.ok(result, "Should not crash on injection attempt");
});

test("Adversarial: gibberish does not crash", () => {
  const result = extractCP2000(FIXTURE_ADVERSARIAL_GIBBERISH);
  assert.equal(result.isCP2000, false);
  assert.equal(result.facts.length, 0);
});

test("Adversarial: finding requires supporting facts", () => {
  assert.throws(
    () => createFinding({
      type: "income_mismatch",
      severity: "high",
      statement: "test",
      supportingFacts: [],
      confidence: "high",
      recommendedAction: "test",
    }),
    "Should throw when no supporting facts",
  );
});

// ═══════════════════════════════════════════════════════════════
// Security: No PII in findings or errors
// ═══════════════════════════════════════════════════════════════

test("Security: findings do not contain raw PII beyond extracted amounts", () => {
  const extraction = extractCP2000(FIXTURE_VALID_SIMPLE);
  const result = analyzeCP2000Discrepancies({ extraction });
  // Findings should contain amounts but not SSNs or full names
  for (const finding of result.findings) {
    assert.ok(!finding.statement.match(/\d{3}-\d{2}-\d{4}/),
      `Finding contains SSN pattern: ${finding.statement}`);
  }
});

test("Security: validation does not expose sensitive data in error messages", () => {
  const extraction = extractCP2000(FIXTURE_VALID_SIMPLE);
  let case_ = createCP2000Case(extraction);
  case_ = setCaseDraft(case_, { content: FIXTURE_DRAFT_WITH_UNSUPPORTED_CLAIM, wordCount: 100, unresolvedPlaceholders: [] });
  const validation = validateCP2000Draft(case_);
  for (const finding of validation.allFindings) {
    assert.ok(!finding.detail.match(/\d{3}-\d{2}-\d{4}/),
      `Validation detail contains SSN pattern: ${finding.detail}`);
  }
});
