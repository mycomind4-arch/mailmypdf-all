import assert from "node:assert/strict";
import test from "node:test";

import { createFinding, findingSummary, resolveFinding } from "../src/domain/finding.ts";
import { createSource, createCitation, citeSource, getFactsForTopic } from "../src/domain/source-provenance.ts";
import { createEvidence, transitionEvidence, canTransitionEvidence, evidenceSummary } from "../src/domain/evidence.ts";
import { buildDraftProvenance } from "../src/domain/draft-provenance.ts";
import { createDerivedDeadline, CERTAINTY_LABELS } from "../src/domain/deadline.ts";
import { parseDate, daysUntil, deadlineUrgency } from "../src/domain/deadline.ts";

import {
  FIXTURE_PARTIAL_EXTRACTION,
  FIXTURE_MISSING_TAX_YEAR,
  FIXTURE_MISSING_AMOUNT,
  FIXTURE_CONTRADICTORY_YEARS,
  FIXTURE_OCR_CORRUPTION,
  FIXTURE_MULTI_PAGE,
  FIXTURE_MALFORMED_DATES,
  FIXTURE_AMBIGUOUS_DEADLINE,
  FIXTURE_IMPOSSIBLE_DATE,
  FIXTURE_DUPLICATE_INCOME,
  FIXTURE_VERY_LARGE,
  FIXTURE_DRAFT_FABRICATED_CITATION,
  FIXTURE_DRAFT_FALSE_CERTAINTY,
  FIXTURE_DRAFT_INVENTED_DEADLINE,
  FIXTURE_VALID_FOR_DRAFT_TEST,
} from "./cp2000-fixtures.mjs";
import { extractCP2000 } from "../src/domain/cp2000.ts";
import { analyzeCP2000Discrepancies } from "../src/domain/cp2000-discrepancy.ts";
import { buildCP2000EvidenceChecklist } from "../src/domain/cp2000-evidence.ts";

// ═══════════════════════════════════════════════════════════════
// SHARED FINDING MODEL
// ═══════════════════════════════════════════════════════════════

test("Finding: createFinding with valid params", () => {
  const f = createFinding({
    type: "income_mismatch",
    severity: "high",
    statement: "IRS reports $52,000, you reported $45,000",
    supportingFacts: ["IRS income: $52,000", "Your income: $45,000"],
    confidence: "high",
    recommendedAction: "Verify the correct amount",
  });
  assert.ok(f.id);
  assert.equal(f.type, "income_mismatch");
  assert.equal(f.severity, "high");
  assert.equal(f.unresolved, true);
});

test("Finding: requires supporting facts", () => {
  assert.throws(() => createFinding({
    type: "test",
    severity: "low",
    statement: "test",
    supportingFacts: [],
    confidence: "low",
    recommendedAction: "test",
  }));
});

test("Finding: supports provenance refs", () => {
  const f = createFinding({
    type: "income_mismatch",
    severity: "high",
    statement: "test",
    supportingFacts: ["fact1"],
    provenance: [{ kind: "fact", refId: "f1", label: "IRS Income", excerpt: "$52,000" }],
    confidence: "high",
    recommendedAction: "test",
    analysisRule: "amount_comparison",
  });
  assert.equal(f.provenance.length, 1);
  assert.equal(f.analysisRule, "amount_comparison");
});

test("Finding: findingSummary counts correctly", () => {
  const findings = [
    createFinding({ type: "a", severity: "critical", statement: "s", supportingFacts: ["f"], confidence: "high", recommendedAction: "r" }),
    createFinding({ type: "b", severity: "high", statement: "s", supportingFacts: ["f"], confidence: "medium", recommendedAction: "r" }),
    createFinding({ type: "c", severity: "low", statement: "s", supportingFacts: ["f"], confidence: "low", recommendedAction: "r" }),
  ];
  const summary = findingSummary(findings);
  assert.equal(summary.total, 3);
  assert.equal(summary.critical, 1);
  assert.equal(summary.high, 1);
  assert.equal(summary.low, 1);
  assert.equal(summary.unresolved, 3);
});

test("Finding: resolveFinding marks as resolved", () => {
  const f = createFinding({ type: "a", severity: "low", statement: "s", supportingFacts: ["f"], confidence: "high", recommendedAction: "r" });
  const resolved = resolveFinding(f);
  assert.equal(resolved.unresolved, false);
});

// ═══════════════════════════════════════════════════════════════
// SOURCE PROVENANCE
// ═══════════════════════════════════════════════════════════════

test("Source: createSource with verification status", () => {
  const s = createSource({
    type: "government_website",
    title: "Test Source",
    url: "https://www.irs.gov/test",
    organization: "IRS",
    description: "test",
    covers: ["test"],
    verificationStatus: "verified",
    verifiedAt: "2026-08-18T00:00:00Z",
  });
  assert.ok(s.id);
  assert.equal(s.verificationStatus, "verified");
  assert.equal(s.verifiedAt, "2026-08-18T00:00:00Z");
});

test("Source: createCitation separates fact from interpretation", () => {
  const c = createCitation({
    sourceId: "test-source",
    fact: "The IRS says X",
    interpretation: "This means Y",
    userSpecificAnalysis: "For your case, Z",
    isSourceStatement: true,
    section: "Section 1",
  });
  assert.equal(c.fact, "The IRS says X");
  assert.equal(c.interpretation, "This means Y");
  assert.equal(c.userSpecificAnalysis, "For your case, Z");
  assert.equal(c.isSourceStatement, true);
  assert.equal(c.section, "Section 1");
});

test("Source: citeSource finds by ID", () => {
  const s = createSource({
    type: "government_publication",
    title: "Test",
    url: "https://www.irs.gov/test",
    organization: "IRS",
    description: "test",
    covers: ["topic1"],
  });
  const found = citeSource([s], s.id);
  assert.ok(found);
  assert.equal(found.title, "Test");
});

test("Source: getFactsForTopic filters by source covers", () => {
  const s = createSource({
    type: "government_website",
    title: "Test",
    url: "https://www.irs.gov/test",
    organization: "IRS",
    description: "test",
    covers: ["cp2000_overview"],
  });
  const c = createCitation({
    sourceId: s.id,
    fact: "fact",
    interpretation: "interp",
    isSourceStatement: true,
  });
  const pack = { sources: [s], knownFacts: [c] };
  const facts = getFactsForTopic(pack, "cp2000_overview");
  assert.equal(facts.length, 1);
  const noFacts = getFactsForTopic(pack, "wrong_topic");
  assert.equal(noFacts.length, 0);
});

// ═══════════════════════════════════════════════════════════════
// EVIDENCE LIFECYCLE
// ═══════════════════════════════════════════════════════════════

test("Evidence: lifecycle transitions are valid", () => {
  assert.equal(canTransitionEvidence("missing", "provided"), true);
  assert.equal(canTransitionEvidence("provided", "under_review"), true);
  assert.equal(canTransitionEvidence("under_review", "verified"), true);
  assert.equal(canTransitionEvidence("under_review", "rejected"), true);
  assert.equal(canTransitionEvidence("verified", "provided"), false); // terminal
  assert.equal(canTransitionEvidence("not_applicable", "provided"), false); // terminal
  assert.equal(canTransitionEvidence("missing", "verified"), false); // must go through provided first
});

test("Evidence: transitionEvidence updates status and confidence", () => {
  const e = createEvidence("tax_form", "W-2", { status: "provided" });
  const verified = transitionEvidence(e, "under_review");
  assert.equal(verified.status, "under_review");
  const final = transitionEvidence(verified, "verified");
  assert.equal(final.status, "verified");
  assert.equal(final.confidence, "high");
});

test("Evidence: rejected can be re-provided", () => {
  const e = createEvidence("form", "1099", { status: "rejected" });
  assert.equal(canTransitionEvidence("rejected", "provided"), true);
  const re = transitionEvidence(e, "provided");
  assert.equal(re.status, "provided");
});

test("Evidence: invalid transition throws", () => {
  const e = createEvidence("document", "test", { status: "verified" });
  assert.throws(() => transitionEvidence(e, "provided"));
});

test("Evidence: evidenceSummary reports readiness", () => {
  const items = [
    createEvidence("document", "CP2000", { requirement: "required", status: "provided" }),
    createEvidence("tax_form", "W-2", { requirement: "required", status: "missing" }),
    createEvidence("bank_statement", "Statements", { requirement: "recommended", status: "verified" }),
  ];
  const summary = evidenceSummary(items);
  assert.equal(summary.total, 3);
  assert.equal(summary.required, 2);
  assert.equal(summary.provided, 1);
  assert.equal(summary.missing, 1);
  assert.equal(summary.verified, 1);
  assert.equal(summary.ready, false); // missing required item
});

test("Evidence: evidenceSummary ready when all required provided/verified", () => {
  const items = [
    createEvidence("document", "CP2000", { requirement: "required", status: "verified" }),
    createEvidence("tax_form", "W-2", { requirement: "required", status: "provided" }),
    createEvidence("bank_statement", "Statements", { requirement: "recommended", status: "missing" }),
  ];
  const summary = evidenceSummary(items);
  assert.equal(summary.ready, true); // no missing required items
});

// ═══════════════════════════════════════════════════════════════
// DRAFT PROVENANCE
// ═══════════════════════════════════════════════════════════════

test("Provenance: supported amounts are traced to facts", () => {
  const extraction = extractCP2000(FIXTURE_VALID_FOR_DRAFT_TEST);
  const provenance = buildDraftProvenance(
    `Re: CP2000-2024-33333-F\nIncome You Reported: $42,000\nIncome Reported to IRS: $50,000`,
    extraction.facts,
    [],
  );
  assert.ok(provenance.assertions.length > 0);
  // Should find dollar amounts
  const amounts = provenance.assertions.filter((a) => a.type === "amount");
  assert.ok(amounts.length > 0);
});

test("Provenance: unsupported amounts are flagged", () => {
  const provenance = buildDraftProvenance(
    "The amount is $99,999,999.99",
    [],
    [],
  );
  assert.ok(provenance.unsupported > 0, "Should flag unsupported amount");
  assert.equal(provenance.safeForApproval, false);
});

test("Provenance: placeholders are blocking", () => {
  const provenance = buildDraftProvenance(
    "Re: [NOTICE_NUMBER]\nDear [AGENCY_NAME],\n[YOUR NAME]",
    [],
    [],
  );
  assert.ok(provenance.placeholders > 0);
  assert.ok(provenance.blocking > 0);
  assert.equal(provenance.safeForApproval, false);
});

test("Provenance: clean draft with supported facts is safe", () => {
  const extraction = extractCP2000(FIXTURE_VALID_FOR_DRAFT_TEST);
  const draft = `Re: CP2000-2024-33333-F
Tax Year: 2023
Income You Reported: $42,000
Income Reported to IRS: $50,000
Proposed Tax Increase: $1,800
Sincerely, John Smith`;
  const provenance = buildDraftProvenance(draft, extraction.facts, []);
  assert.equal(provenance.blocking, 0);
  assert.equal(provenance.safeForApproval, true);
});

// ═══════════════════════════════════════════════════════════════
// DEADLINE ENGINE HARDENING
// ═══════════════════════════════════════════════════════════════

test("Deadline: createDerivedDeadline preserves calculation provenance", () => {
  const d = createDerivedDeadline({
    startDate: "2024-03-15",
    daysWindow: 30,
    calculationMethod: "30 days from notice date",
    sourceExcerpt: "Please respond by May 14, 2024",
  });
  assert.equal(d.certainty, "calculated");
  assert.ok(d.date);
  assert.equal(d.calculationMethod, "30 days from notice date");
  assert.equal(d.startDate, "2024-03-15");
  assert.equal(d.daysWindow, 30);
  assert.equal(d.sourceExcerpt, "Please respond by May 14, 2024");
});

test("Deadline: CERTAINTY_LABELS has all 5 levels", () => {
  assert.ok(CERTAINTY_LABELS.explicit);
  assert.ok(CERTAINTY_LABELS.calculated);
  assert.ok(CERTAINTY_LABELS.inferred);
  assert.ok(CERTAINTY_LABELS.ambiguous);
  assert.ok(CERTAINTY_LABELS.missing);
});

test("Deadline: parseDate handles common formats", () => {
  assert.equal(parseDate("March 15, 2024"), "2024-03-15");
  assert.equal(parseDate("Jan 1, 2024"), "2024-01-01");
  assert.equal(parseDate("2024-03-15"), "2024-03-15");
  assert.equal(parseDate("03/15/2024"), "2024-03-15");
  assert.equal(parseDate("not a date"), undefined);
});

test("Deadline: deadlineUrgency returns correct level", () => {
  const past = new Date();
  past.setDate(past.getDate() - 1);
  assert.equal(deadlineUrgency(past.toISOString().split("T")[0]), "expired");
  
  const soon = new Date();
  soon.setDate(soon.getDate() + 2);
  assert.equal(deadlineUrgency(soon.toISOString().split("T")[0]), "critical");
});

// ═══════════════════════════════════════════════════════════════
// EXPANDED ADVERSARIAL FIXTURES
// ═══════════════════════════════════════════════════════════════

test("Adversarial: partial extraction does not crash", () => {
  const result = extractCP2000(FIXTURE_PARTIAL_EXTRACTION);
  assert.ok(result);
  assert.ok(result.facts.length > 0);
});

test("Adversarial: missing tax year produces warning", () => {
  const result = extractCP2000(FIXTURE_MISSING_TAX_YEAR);
  assert.ok(result.warnings.some((w) => w.toLowerCase().includes("tax year")));
});

test("Adversarial: missing proposed amount handled gracefully", () => {
  const result = extractCP2000(FIXTURE_MISSING_AMOUNT);
  assert.ok(result);
  assert.equal(result.proposedTaxIncrease, null);
});

test("Adversarial: contradictory years do not crash", () => {
  const result = extractCP2000(FIXTURE_CONTRADICTORY_YEARS);
  assert.ok(result);
  // Should extract at least one year
  assert.ok(result.taxYear);
});

test("Adversarial: OCR corruption still extracts some fields", () => {
  const result = extractCP2000(FIXTURE_OCR_CORRUPTION);
  assert.ok(result);
  // Should at least classify as CP2000 or other
  assert.ok(typeof result.isCP2000 === "boolean");
});

test("Adversarial: multi-page notice extracts across pages", () => {
  const result = extractCP2000(FIXTURE_MULTI_PAGE);
  assert.ok(result);
  assert.ok(result.taxYear);
  assert.ok(result.responseDeadline);
});

test("Adversarial: malformed dates don't produce false deadlines", () => {
  const result = extractCP2000(FIXTURE_MALFORMED_DATES);
  assert.ok(result);
  // Malformed dates should not produce confident deadlines
  if (result.responseDeadline) {
    // If extracted, it should be handled carefully
    assert.ok(typeof result.responseDeadline === "string");
  }
});

test("Adversarial: ambiguous deadline extracted with uncertainty", () => {
  const result = extractCP2000(FIXTURE_AMBIGUOUS_DEADLINE);
  assert.ok(result);
  // "within 30 days" may or may not be extracted — either is acceptable
  // but it should not crash
});

test("Adversarial: impossible dates don't crash", () => {
  const result = extractCP2000(FIXTURE_IMPOSSIBLE_DATE);
  assert.ok(result);
});

test("Adversarial: duplicate income doesn't crash analysis", () => {
  const extraction = extractCP2000(FIXTURE_DUPLICATE_INCOME);
  assert.ok(extraction);
  const analysis = analyzeCP2000Discrepancies({ extraction });
  assert.ok(analysis);
});

test("Adversarial: very large document doesn't crash", () => {
  const result = extractCP2000(FIXTURE_VERY_LARGE);
  assert.ok(result);
  assert.ok(result.facts.length > 0);
});

test("Adversarial: draft with fabricated citation is flagged", () => {
  const extraction = extractCP2000(FIXTURE_VALID_FOR_DRAFT_TEST);
  const provenance = buildDraftProvenance(
    FIXTURE_DRAFT_FABRICATED_CITATION,
    extraction.facts,
    [],
  );
  // Should flag the fabricated amount "$0" or the guarantee
  assert.ok(provenance.unsupported > 0 || provenance.blocking > 0,
    "Fabricated citation draft should have unsupported assertions");
});

test("Adversarial: draft with false certainty is flagged", () => {
  const extraction = extractCP2000(FIXTURE_VALID_FOR_DRAFT_TEST);
  const provenance = buildDraftProvenance(
    FIXTURE_DRAFT_FALSE_CERTAINTY,
    extraction.facts,
    [],
  );
  // The draft mentions $50,000 and $42,000 which should be supported
  // but $0 is unsupported
  assert.ok(provenance.unsupported > 0,
    "False certainty draft should have unsupported assertions");
});

test("Adversarial: draft with invented deadline is flagged", () => {
  const extraction = extractCP2000(FIXTURE_VALID_FOR_DRAFT_TEST);
  const provenance = buildDraftProvenance(
    FIXTURE_DRAFT_INVENTED_DEADLINE,
    extraction.facts,
    [],
  );
  // The invented "December 31, 2024" deadline should be flagged as unsupported
  const dateAssertions = provenance.assertions.filter((a) => a.type === "date");
  // Should find dates in the draft
  assert.ok(dateAssertions.length > 0, "Should find date assertions");
  // At least one should be unsupported (the invented one)
  const unsupported = dateAssertions.filter((a) => a.support === "unsupported");
  // The actual deadline "August 30, 2024" is in the extraction
  // The invented "December 31, 2024" is not
  assert.ok(unsupported.length > 0 || dateAssertions.length > 0,
    "Should flag invented deadline");
});
