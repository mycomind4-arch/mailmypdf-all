/* ═══════════════════════════════════════════════════════════
   CP14 AUTHORITY GATES — specialized verification functions
   that check whether a CP14 workflow instance meets each
   quality gate before the workflow can be promoted to
   "authority" lifecycle.

   These functions are CP14-specific: they know about balance due,
   payment deadlines, installment agreements, and the CP14
   response structure. They do NOT duplicate general workflow
   runtime logic — they enrich it with CP14 domain knowledge.

   All checks are deterministic.
   All language is factual — no tax conclusions.
   ═══════════════════════════════════════════════════════════ */

import type { CP14Extraction } from "./cp14";
import type { NoticeFact } from "./fact";
import type { Contradiction } from "./contradiction";
import type { MissingInfoItem } from "./missing-info";

// ── Types ─────────────────────────────────────────────────────

export interface CP14GateResult {
  gate: string;
  passed: boolean;
  details: string;
  missing: string[];
}

export interface CP14AuthorityAudit {
  documentRecognition: CP14GateResult;
  factGrounding: CP14GateResult;
  deadlineVerification: CP14GateResult;
  requirementCoverage: CP14GateResult;
  evidenceGrounding: CP14GateResult;
  draftValidation: CP14GateResult;
  submissionReadiness: CP14GateResult;
  proofReady: CP14GateResult;
  allPassed: boolean;
}

// ── Gate 1: Document Recognition ──────────────────────────────

export function checkDocumentRecognition(extraction: CP14Extraction): CP14GateResult {
  const missing: string[] = [];

  if (!extraction.isCP14) {
    return {
      gate: "documentRecognition",
      passed: false,
      details: `Document classified as non-CP14 (confidence ${(extraction.classificationConfidence * 100).toFixed(0)}%)`,
      missing: ["Document must be classified as CP14"],
    };
  }

  if (extraction.classificationConfidence < 0.5) {
    missing.push("Classification confidence below 50%");
  }

  if (!extraction.noticeNumber) {
    missing.push("Notice number not extracted — cannot confirm CP14 identity");
  }

  return {
    gate: "documentRecognition",
    passed: missing.length === 0,
    details: extraction.noticeNumber
      ? `CP14 recognized (notice: ${extraction.noticeNumber}, confidence ${(extraction.classificationConfidence * 100).toFixed(0)}%)`
      : `CP14 recognized but notice number missing`,
    missing,
  };
}

// ── Gate 2: Fact Grounding ────────────────────────────────────

export function checkFactGrounding(extraction: CP14Extraction): CP14GateResult {
  const missing: string[] = [];
  const facts = extraction.facts;

  if (facts.length === 0) {
    return {
      gate: "factGrounding",
      passed: false,
      details: "No facts extracted from document",
      missing: ["At least one fact must be extracted with provenance"],
    };
  }

  // Every fact must have provenance (sourceExcerpt + extractionMethod)
  for (const fact of facts) {
    if (!fact.sourceExcerpt) {
      missing.push(`Fact "${fact.label}" has no source excerpt`);
    }
    if (!fact.extractionMethod) {
      missing.push(`Fact "${fact.label}" has no extraction method`);
    }
  }

  // Key CP14 facts should be present
  const hasNoticeNumber = facts.some((f) => f.label === "Notice Number");
  const hasBalance = facts.some((f) => f.label === "Balance Due" || f.label === "Total Amount Due");
  const hasDeadline = facts.some(
    (f) => f.label === "Response Deadline" || f.label === "Payment Deadline",
  );

  if (!hasNoticeNumber) missing.push("Notice Number fact not extracted");
  if (!hasBalance) missing.push("Balance or total due fact not extracted");
  if (!hasDeadline) missing.push("Response or payment deadline fact not extracted");

  return {
    gate: "factGrounding",
    passed: missing.length === 0,
    details: `${facts.length} facts extracted, ${missing.length} grounding issues`,
    missing,
  };
}

// ── Gate 3: Deadline Verification ─────────────────────────────

export function checkDeadlineVerification(extraction: CP14Extraction): CP14GateResult {
  const missing: string[] = [];
  const hasResponseDeadline = extraction.responseDeadline !== null;
  const hasPaymentDeadline = extraction.paymentDeadline !== null;

  if (!hasResponseDeadline && !hasPaymentDeadline) {
    missing.push("No response or payment deadline extracted from notice");
    return {
      gate: "deadlineVerification",
      passed: false,
      details: "No deadline found in notice",
      missing,
    };
  }

  // Check for ambiguous deadlines (too long to be a date)
  if (hasResponseDeadline && extraction.responseDeadline!.length > 50) {
    missing.push("Response deadline text is too long — may be ambiguous");
  }
  if (hasPaymentDeadline && extraction.paymentDeadline!.length > 50) {
    missing.push("Payment deadline text is too long — may be ambiguous");
  }

  // Check for deadline warnings from extraction
  const deadlineWarning = extraction.warnings.find((w) =>
    w.toLowerCase().includes("deadline"),
  );
  if (deadlineWarning) {
    missing.push(`Extraction warning: ${deadlineWarning}`);
  }

  return {
    gate: "deadlineVerification",
    passed: missing.length === 0,
    details: hasResponseDeadline
      ? `Response deadline: ${extraction.responseDeadline}`
      : `Payment deadline: ${extraction.paymentDeadline}`,
    missing,
  };
}

// ── Gate 4: Requirement Coverage ──────────────────────────────

export function checkRequirementCoverage(
  extraction: CP14Extraction,
  draft: string | null,
): CP14GateResult {
  const missing: string[] = [];

  // CP14 requirements:
  // 1. Pay or respond explaining why balance is incorrect
  // 2. Use response/payment address from notice
  // 3. Attach supporting documentation if disputing

  if (!draft) {
    missing.push("No draft generated — cannot verify requirement coverage");
    return {
      gate: "requirementCoverage",
      passed: false,
      details: "Draft not yet generated",
      missing,
    };
  }

  const draftLower = draft.toLowerCase();

  // Check that the draft addresses pay-or-respond
  if (!draftLower.includes("pay") && !draftLower.includes("dispute") && !draftLower.includes("installment")) {
    missing.push("Draft does not address pay-or-respond requirement");
  }

  // Check that the draft references the notice number
  if (extraction.noticeNumber && !draftLower.includes(extraction.noticeNumber.toLowerCase())) {
    missing.push("Draft does not reference the notice number");
  }

  // Check that the draft mentions attachments/supporting documents
  if (!draftLower.includes("attachment") && !draftLower.includes("enclosed") && !draftLower.includes("supporting")) {
    missing.push("Draft does not mention attachments or supporting documents");
  }

  // Check that the draft includes recipient information
  if (!draftLower.includes("dear") && !draftLower.includes("sincerely")) {
    missing.push("Draft does not include proper letter structure (greeting/closing)");
  }

  return {
    gate: "requirementCoverage",
    passed: missing.length === 0,
    details: missing.length === 0
      ? "All CP14 requirements addressed in draft"
      : `${missing.length} requirements not covered`,
    missing,
  };
}

// ── Gate 5: Evidence Grounding ────────────────────────────────

export function checkEvidenceGrounding(
  extraction: CP14Extraction,
  contradictions: Contradiction[],
  missingInfo: MissingInfoItem[],
  evidenceProvided: boolean,
): CP14GateResult {
  const missing: string[] = [];

  // If user is disputing, evidence is required
  const isDisputing = (extraction.requestedAction?.toLowerCase().includes("dispute") ?? false) || (extraction.requestedAction?.toLowerCase().includes("incorrect") ?? false) || (extraction.requestedAction?.toLowerCase().includes("disagree") ?? false);

  if (isDisputing && !evidenceProvided) {
    missing.push("Dispute response requires supporting evidence, but none provided");
  }

  // Unresolved contradictions fail the gate
  const unresolvedContradictions = contradictions.filter((c) => !c.resolved);
  if (unresolvedContradictions.length > 0) {
    missing.push(`${unresolvedContradictions.length} unresolved contradiction(s) detected`);
  }

  // Critical missing info items fail the gate
  const criticalMissing = missingInfo.filter(
    (m) => m.severity === "critical" && !m.resolved && !m.dismissed,
  );
  if (criticalMissing.length > 0) {
    missing.push(`${criticalMissing.length} critical missing info item(s)`);
  }

  return {
    gate: "evidenceGrounding",
    passed: missing.length === 0,
    details: missing.length === 0
      ? "Evidence grounding verified"
      : `${missing.length} evidence issues`,
    missing,
  };
}

// ── Gate 6: Draft Validation ──────────────────────────────────

export function checkDraftValidation(
  validationResult: { passed: boolean; errors: string[] } | null,
): CP14GateResult {
  if (!validationResult) {
    return {
      gate: "draftValidation",
      passed: false,
      details: "Draft validation not run",
      missing: ["Draft validation must be performed before authority"],
    };
  }

  return {
    gate: "draftValidation",
    passed: validationResult.passed,
    details: validationResult.passed
      ? "Draft validation passed"
      : `Draft validation failed with ${validationResult.errors.length} error(s)`,
    missing: validationResult.passed ? [] : validationResult.errors,
  };
}

// ── Gate 7: Submission Readiness ──────────────────────────────

export function checkSubmissionReadiness(
  reviewChecks: { allChecked: boolean },
  mailingFunnelReady: boolean,
): CP14GateResult {
  const missing: string[] = [];

  if (!reviewChecks.allChecked) {
    missing.push("Not all review checks completed");
  }

  if (!mailingFunnelReady) {
    missing.push("Mailing funnel not ready (recipient or method not confirmed)");
  }

  return {
    gate: "submissionReadiness",
    passed: missing.length === 0,
    details: missing.length === 0
      ? "Submission readiness verified"
      : `${missing.length} submission issues`,
    missing,
  };
}

// ── Gate 8: Proof Ready ───────────────────────────────────────

export function checkProofReady(
  mailingResult: { success: boolean; providerOrderId: string | null; trackingNumber: string | null } | null,
): CP14GateResult {
  if (!mailingResult) {
    return {
      gate: "proofReady",
      passed: false,
      details: "Mailing not yet completed",
      missing: ["Mailing must be completed with provider response"],
    };
  }

  if (!mailingResult.success) {
    return {
      gate: "proofReady",
      passed: false,
      details: "Mailing was not successful",
      missing: ["Mailing must succeed before proof is available"],
    };
  }

  const missing: string[] = [];
  if (!mailingResult.providerOrderId) {
    missing.push("Provider order ID missing from mailing response");
  }
  if (!mailingResult.trackingNumber) {
    // Tracking may not be available for all mail types — warn but don't fail
    // Only fail if no providerOrderId either
    if (!mailingResult.providerOrderId) {
      missing.push("No proof metadata (order ID or tracking) returned");
    }
  }

  return {
    gate: "proofReady",
    passed: missing.length === 0,
    details: mailingResult.providerOrderId
      ? `Proof available: order ${mailingResult.providerOrderId}`
      : "No proof metadata",
    missing,
  };
}

// ── Full Authority Audit ──────────────────────────────────────

export function auditCP14Authority(params: {
  extraction: CP14Extraction;
  draft: string | null;
  validationResult: { passed: boolean; errors: string[] } | null;
  contradictions: Contradiction[];
  missingInfo: MissingInfoItem[];
  evidenceProvided: boolean;
  reviewChecks: { allChecked: boolean };
  mailingFunnelReady: boolean;
  mailingResult: { success: boolean; providerOrderId: string | null; trackingNumber: string | null } | null;
}): CP14AuthorityAudit {
  const documentRecognition = checkDocumentRecognition(params.extraction);
  const factGrounding = checkFactGrounding(params.extraction);
  const deadlineVerification = checkDeadlineVerification(params.extraction);
  const requirementCoverage = checkRequirementCoverage(params.extraction, params.draft);
  const evidenceGrounding = checkEvidenceGrounding(
    params.extraction,
    params.contradictions,
    params.missingInfo,
    params.evidenceProvided,
  );
  const draftValidation = checkDraftValidation(params.validationResult);
  const submissionReadiness = checkSubmissionReadiness(
    params.reviewChecks,
    params.mailingFunnelReady,
  );
  const proofReady = checkProofReady(params.mailingResult);

  const allPassed =
    documentRecognition.passed &&
    factGrounding.passed &&
    deadlineVerification.passed &&
    requirementCoverage.passed &&
    evidenceGrounding.passed &&
    draftValidation.passed &&
    submissionReadiness.passed &&
    proofReady.passed;

  return {
    documentRecognition,
    factGrounding,
    deadlineVerification,
    requirementCoverage,
    evidenceGrounding,
    draftValidation,
    submissionReadiness,
    proofReady,
    allPassed,
  };
}
