// ─── RECORDS REQUEST INTEGRATION ─────────────────────────────────────────
// Phase 4: Gap-driven records requests. When findings surface a fact gap
// (missing proof of mailing, no inspection report, etc.), this module
// creates a prefilled records request from the case's known facts.

import type { FindingType, UnifiedFinding } from "../findings/taxonomy";

// ── Finding types that indicate a records gap ──────────────────────────

const GAP_FINDING_TYPES: FindingType[] = [
  "MISSING_REQUESTED_CATEGORY",
  "REFERENCED_RECORD_NOT_PRODUCED",
  "MISSING_ATTACHMENT",
  "PARTIAL_PRODUCTION",
  "PRODUCTION_AMBIGUITY",
  "NO_PRIOR_NOTICE",
  "DATE_GAP",
];

export function isGapFinding(finding: UnifiedFinding): boolean {
  return GAP_FINDING_TYPES.includes(finding.type);
}

// ── Records Request Model ──────────────────────────────────────────────

export interface RecordsRequestPrefill {
  agency: string;
  department: string;
  property: string;
  parcelNumber?: string;
  caseNumber?: string;
  violationNumber?: string;
  party: string;
  dateRangeStart?: string;
  dateRangeEnd?: string;
  subjectMatter: string[];
  // Tracking
  status: "draft" | "submitted" | "in_review" | "approved" | "fulfilled" | "denied";
  createdAt: string;
  // Findings from production analysis (filled when fulfilled)
  productionFindings?: UnifiedFinding[];
  // Link back to originating code-enforcement case
  originatingCaseId?: string;
}

export interface RecordsRequestResult {
  request: RecordsRequestPrefill;
  // Whether production was received
  produced: boolean;
  // Findings from production analysis
  findings: UnifiedFinding[];
  // Missing categories still outstanding
  missingCategories: string[];
}

// ── Prefill Builder ────────────────────────────────────────────────────

export function buildRecordsRequestPrefill(params: {
  agencyName?: string;
  jurisdiction?: string;
  propertyAddress?: string;
  apn?: string;
  caseNumber?: string;
  violationNumber?: string;
  recipientName?: string;
  noticeDate?: string;
  deadlineDate?: string;
  gapFindings: UnifiedFinding[];
}): RecordsRequestPrefill {
  // Derive subject matter from gap findings
  const subjectMatter = new Set<string>();

  for (const finding of params.gapFindings) {
    switch (finding.type) {
      case "NO_PRIOR_NOTICE":
        subjectMatter.add("Proof of mailing / service of notice");
        subjectMatter.add("Notice of violation and associated correspondence");
        break;
      case "MISSING_ATTACHMENT":
        subjectMatter.add("All attachments referenced in the notice");
        break;
      case "DATE_GAP":
        subjectMatter.add("Inspection reports and field notes");
        subjectMatter.add("Inspector logs and dispatch records");
        break;
      case "REFERENCED_RECORD_NOT_PRODUCED":
        subjectMatter.add("All documents referenced in the case file");
        break;
      case "MISSING_REQUESTED_CATEGORY":
        subjectMatter.add("Complete case file including all categories");
        break;
      default:
        subjectMatter.add("Complete administrative record for the case");
        break;
    }
  }

  // Always include core categories for code enforcement
  subjectMatter.add("Complaint or intake form that initiated the case");
  subjectMatter.add("All inspection reports and photographs");
  subjectMatter.add("Notice of violation and proof of service");
  subjectMatter.add("All correspondence with property owner");

  return {
    agency: params.agencyName || params.jurisdiction || "Unknown Agency",
    department: "Code Enforcement Division",
    property: params.propertyAddress || "Unknown Property",
    parcelNumber: params.apn,
    caseNumber: params.caseNumber,
    violationNumber: params.violationNumber,
    party: params.recipientName || "Property Owner",
    dateRangeStart: params.noticeDate,
    dateRangeEnd: params.deadlineDate,
    subjectMatter: [...subjectMatter],
    status: "draft",
    createdAt: new Date().toISOString(),
  };
}

// ── Production Analysis ────────────────────────────────────────────────
// When records come back, analyze what was produced vs. what was requested.
// Uses the same finding taxonomy as everything else.

export function analyzeProduction(params: {
  request: RecordsRequestPrefill;
  producedCategories: string[];
  referencedButNotProduced: string[];
  identifierMismatches: { field: string; expected: string; actual: string }[];
  redactedItems: { description: string; legalBasis?: string }[];
  duplicateItems: string[];
}): RecordsRequestResult {
  const findings: UnifiedFinding[] = [];
  const missingCategories: string[] = [];

  // Check for missing requested categories
  for (const requested of params.request.subjectMatter) {
    const produced = params.producedCategories.some((p) =>
      requested.toLowerCase().includes(p.toLowerCase()) ||
      p.toLowerCase().includes(requested.toLowerCase().split(" ")[0])
    );
    if (!produced) {
      missingCategories.push(requested);
      findings.push({
        id: `finding-prod-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: "MISSING_REQUESTED_CATEGORY",
        severity: "high",
        statement: `Requested category not produced: "${requested}"`,
        supportingFacts: [params.request.caseNumber || "records request"],
        confidence: "high",
        recommendedAction: "Follow up with agency for the missing category or document non-production.",
        source: "records",
        unresolved: true,
        analysisRule: "production-analysis-missing",
      });
    }
  }

  // Check for referenced but not produced
  for (const ref of params.referencedButNotProduced) {
    findings.push({
      id: `finding-prod-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: "REFERENCED_RECORD_NOT_PRODUCED",
      severity: "high",
      statement: `Document referenced in the record was not produced: "${ref}"`,
      supportingFacts: [ref],
      confidence: "high",
      recommendedAction: "Request the referenced document specifically.",
      source: "records",
      unresolved: true,
      analysisRule: "production-analysis-referenced",
    });
  }

  // Check for identifier mismatches
  for (const mismatch of params.identifierMismatches) {
    findings.push({
      id: `finding-prod-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: "IDENTIFIER_MISMATCH",
      severity: "medium",
      statement: `Identifier mismatch: ${mismatch.field} expected "${mismatch.expected}" but found "${mismatch.actual}"`,
      supportingFacts: [mismatch.field, mismatch.expected, mismatch.actual],
      confidence: "high",
      recommendedAction: "Verify which identifier is correct and flag the discrepancy.",
      source: "records",
      unresolved: true,
      analysisRule: "production-analysis-identifier",
    });
  }

  // Check for unexplained redactions
  for (const redaction of params.redactedItems) {
    if (!redaction.legalBasis || redaction.legalBasis.trim() === "") {
      findings.push({
        id: `finding-prod-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: "UNEXPLAINED_REDACTION",
        severity: "medium",
        statement: `Unexplained redaction: "${redaction.description}" — no legal basis stated`,
        supportingFacts: [redaction.description],
        confidence: "high",
        recommendedAction: "Request the legal basis for the redaction or an unredacted copy.",
        source: "records",
        unresolved: true,
        analysisRule: "production-analysis-redaction",
      });
    }
  }

  // Check for duplicates
  for (const dup of params.duplicateItems) {
    findings.push({
      id: `finding-prod-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: "DUPLICATE_RECORD",
      severity: "low",
      statement: `Duplicate record produced: "${dup}"`,
      supportingFacts: [dup],
      confidence: "high",
      recommendedAction: "Note the duplicate — may indicate disorganized record-keeping.",
      source: "records",
      unresolved: true,
      analysisRule: "production-analysis-duplicate",
    });
  }

  return {
    request: { ...params.request, status: "fulfilled", productionFindings: findings },
    produced: params.producedCategories.length > 0,
    findings,
    missingCategories,
  };
}
