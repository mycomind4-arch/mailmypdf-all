/* ═══════════════════════════════════════════════════════════
   CP523 TWO-PASS VALIDATION

   VALIDATOR A — Factual Consistency
   Checks the draft against the structured case: names, dates,
   amounts, installment agreement info, evidence references,
   and claims made in the draft.

   VALIDATOR B — Requirement Completeness
   Checks required response components, identified discrepancies,
   supporting evidence, requested actions, deadline, attachments,
   unresolved issues, and source requirements.

   The writer is NOT allowed to grade itself.

   ═══════════════════════════════════════════════════════════ */

import type { CP523Case, CP523ValidationResult, CP523ValidationFinding } from "./cp523-case";
import type { CP523Extraction } from "./cp523";
import type { Discrepancy } from "./cp523-discrepancy";
import type { Finding } from "./cp523-findings";

// ── Validator A: Factual Consistency ──────────────────────────

export function validateFactualConsistency(
  draftText: string,
  extraction: CP523Extraction,
  discrepancies: Discrepancy[],
  userFacts: string | null,
): CP523ValidationFinding[] {
  const findings: CP523ValidationFinding[] = [];
  const draftLower = draftText.toLowerCase();

  // ── Notice number ──
  if (extraction.noticeNumber) {
    const found = draftText.includes(extraction.noticeNumber);
    findings.push({
      check: "notice_number_present",
      passed: found,
      detail: found
        ? `Notice number "${extraction.noticeNumber}" is in the draft`
        : `Notice number "${extraction.noticeNumber}" from extraction is missing from the draft`,
      severity: "warning",
      validator: "factual",
    });
  }

  // ── Tax years ──
  for (const year of extraction.taxYearsCovered) {
    const found = draftText.includes(year);
    findings.push({
      check: `tax_year_present:${year}`,
      passed: found,
      detail: found
        ? `Tax year "${year}" is in the draft`
        : `Tax year "${year}" from extraction is missing from the draft`,
      severity: "info",
      validator: "factual",
    });
  }

  // ── Response deadline ──
  if (extraction.responseDeadline) {
    const found = draftText.includes(extraction.responseDeadline);
    findings.push({
      check: "deadline_present",
      passed: found,
      detail: found
        ? `Response deadline "${extraction.responseDeadline}" is in the draft`
        : `Response deadline from extraction is missing from the draft — verify manually`,
      severity: "info",
      validator: "factual",
    });
  }

  // ── CDP hearing deadline ──
  if (extraction.cdpHearingDeadline) {
    const found = draftText.includes(extraction.cdpHearingDeadline);
    findings.push({
      check: "cdp_deadline_present",
      passed: found,
      detail: found
        ? `CDP hearing deadline "${extraction.cdpHearingDeadline}" is in the draft`
        : `CDP hearing deadline from extraction is missing from the draft`,
      severity: "info",
      validator: "factual",
    });
  }

  // ── Amounts ──
  const amounts = [
    extraction.balanceDue,
    extraction.penaltyAmount,
    extraction.interestAmount,
    extraction.totalDue,
  ].filter(Boolean) as string[];

  for (const amount of amounts) {
    const found = draftText.includes(amount);
    findings.push({
      check: `amount_present:${amount}`,
      passed: found,
      detail: found
        ? `Amount "${amount}" is in the draft`
        : `Amount "${amount}" from extraction is not in the draft — verify if needed`,
      severity: "info",
      validator: "factual",
    });
  }

  // ── Installment agreement number ──
  if (extraction.installmentAgreementNumber) {
    const found = draftText.includes(extraction.installmentAgreementNumber);
    findings.push({
      check: "ia_number_present",
      passed: found,
      detail: found
        ? `Installment agreement number "${extraction.installmentAgreementNumber}" is in the draft`
        : `Installment agreement number from extraction is not in the draft`,
      severity: "info",
      validator: "factual",
    });
  }

  // ── Check for fabricated amounts (not in extraction or user facts) ──
  const draftAmounts = draftText.match(/\$[\d,]+\.?\d*/g) ?? [];
  const knownAmounts = new Set([
    ...amounts.map((a) => a.replace("$", "")),
    ...(userFacts?.match(/\$?[\d,]+\.?\d*/g) ?? []),
  ]);

  for (const amount of draftAmounts) {
    const numPart = amount.replace("$", "");
    if (!Array.from(knownAmounts).some((k) => k?.includes(numPart))) {
      findings.push({
        check: `unsupported_amount:${amount}`,
        passed: false,
        detail: `Amount "${amount}" in the draft is not found in extracted facts or user-provided information. Verify this amount.`,
        severity: "warning",
        validator: "factual",
      });
    }
  }

  // ── Check for placeholders ──
  const placeholders = draftText.match(/\[[A-Z_ ]+\]/g) ?? [];
  for (const placeholder of placeholders) {
    findings.push({
      check: `placeholder:${placeholder}`,
      passed: false,
      detail: `Unresolved placeholder "${placeholder}" in the draft. Fill in before mailing.`,
      severity: "warning",
      validator: "factual",
    });
  }

  // ── Check for forbidden claims ──
  const forbiddenPatterns: Record<string, RegExp> = {
    "tax_advice": /\b(tax advice|tax recommendation|I recommend.*tax)\b/i,
    "legal_conclusion": /\b(the correct tax is|your tax liability is|you owe)\b/i,
    "guaranteed_outcome": /\b(guaranteed|will result|certain to|assured)\b/i,
    "fabricated_authority": /\b(according to.*law|the law states|statute \d|IRC §\d)/i,
  };

  for (const [name, pattern] of Object.entries(forbiddenPatterns)) {
    if (pattern.test(draftText)) {
      findings.push({
        check: `forbidden_claim:${name}`,
        passed: false,
        detail: `Draft contains potentially forbidden claim: "${name}". Review and remove if not supported by evidence.`,
        severity: "warning",
        validator: "factual",
      });
    }
  }

  return findings;
}

// ── Validator B: Requirement Completeness ────────────────────

export function validateRequirementCompleteness(
  draftText: string,
  case_: CP523Case,
): CP523ValidationFinding[] {
  const findings: CP523ValidationFinding[] = [];
  const draftLower = draftText.toLowerCase();

  // ── Required sections ──
  const requiredSections = [
    { section: "Re:", check: "re_line" },
    { section: "dear", check: "salutation" },
    { section: "sincerely", check: "closing" },
  ];

  for (const { section, check } of requiredSections) {
    const found = draftLower.includes(section.toLowerCase());
    findings.push({
      check: `required_section:${check}`,
      passed: found,
      detail: found
        ? `Required section "${section}" found`
        : `Required section "${section}" not found in draft`,
      severity: "error",
      validator: "requirement",
    });
  }

  // ── Each discrepancy addressed ──
  for (const d of case_.discrepancies) {
    if (d.type === "balance_dispute") {
      const irsAmount = d.irsAmount;
      const userAmount = d.userAmount;
      const mentionsDiscrepancy =
        (irsAmount && draftText.includes(irsAmount)) ||
        (userAmount && draftText.includes(userAmount));
      findings.push({
        check: `discrepancy_addressed:${d.id}`,
        passed: mentionsDiscrepancy,
        detail: mentionsDiscrepancy
          ? `Discrepancy between ${irsAmount ?? "?"} and ${userAmount ?? "?"} appears to be addressed`
          : `Discrepancy between ${irsAmount ?? "?"} and ${userAmount ?? "?"} is not addressed in the draft`,
        severity: "warning",
        validator: "requirement",
      });
    }
  }

  // ── Evidence listed ──
  const requiredEvidence = case_.evidence.filter(
    (e) => e.requirement === "required" && e.state === "provided",
  );
  if (requiredEvidence.length > 0) {
    const draftHasEnclosure = draftLower.includes("enclosed") || draftLower.includes("attached") || draftLower.includes("include");
    findings.push({
      check: "evidence_listed",
      passed: draftHasEnclosure,
      detail: draftHasEnclosure
        ? "Draft references enclosed/attached documentation"
        : "Draft does not reference the enclosed documentation — add a list of enclosed evidence",
      severity: "block",
      validator: "requirement",
    });
  }

  // ── Deadline mentioned ──
  if (case_.deadline.parsed) {
    const deadlineMentioned = draftText.includes(case_.deadline.parsed) ||
      draftLower.includes("deadline") || draftLower.includes("timely") || draftLower.includes("30 days");
    findings.push({
      check: "deadline_referenced",
      passed: deadlineMentioned,
      detail: deadlineMentioned
        ? "Draft references the response deadline or timeliness"
        : "Draft does not reference the response deadline — add a reference to the deadline",
      severity: "info",
      validator: "requirement",
    });
  }

  // ── Requested actions present ──
  if (case_.strategy) {
    const hasRequestedAction = draftLower.includes("request") || draftLower.includes("please") || draftLower.includes("ask") || draftLower.includes("reinstate");
    findings.push({
      check: "requested_actions_present",
      passed: hasRequestedAction,
      detail: hasRequestedAction
        ? "Draft contains a request or action item"
        : "Draft does not clearly state what action is being requested",
      severity: "warning",
      validator: "requirement",
    });
  }

  // ── Unresolved issues ──
  const unresolvedDiscrepancies = case_.discrepancies.filter((d) => d.status === "unresolved");
  if (unresolvedDiscrepancies.length > 0) {
    findings.push({
      check: "unresolved_issues",
      passed: false,
      detail: `${unresolvedDiscrepancies.length} unresolved discrepancy(ies) remain. These should be resolved or explicitly noted in the response.`,
      severity: "block",
      validator: "requirement",
    });
  }

  // ── Source citations ──
  if (case_.strategy?.supportingSources && case_.strategy.supportingSources.length > 0) {
    const hasSourceRef = draftLower.includes("irs.gov") || draftLower.includes("publication") ||
      draftLower.includes("form") || draftLower.includes("notice");
    findings.push({
      check: "source_citations",
      passed: hasSourceRef,
      detail: hasSourceRef
        ? "Draft references IRS sources or forms"
        : "Draft does not reference any IRS sources or forms — consider referencing relevant publications",
      severity: "info",
      validator: "requirement",
    });
  }

  return findings;
}

// ── Combined Validation ──────────────────────────────────────

export function validateCP523Draft(
  draftText: string,
  case_: CP523Case,
): CP523ValidationResult {
  const factualFindings = validateFactualConsistency(
    draftText,
    case_.notice.extraction,
    case_.discrepancies,
    case_.userFacts,
  );
  const requirementFindings = validateRequirementCompleteness(draftText, case_);

  const allFindings = [...factualFindings, ...requirementFindings];

  const errors = allFindings.filter((f) => f.severity === "error" && !f.passed).length;
  const warnings = allFindings.filter((f) => f.severity === "warning" && !f.passed).length;
  const blocks = allFindings.filter((f) => f.severity === "block" && !f.passed).length;

  return {
    factualFindings,
    requirementFindings,
    allFindings,
    passed: errors === 0 && blocks === 0,
    errors,
    warnings,
    blocks,
    blocked: blocks > 0,
  };
}
