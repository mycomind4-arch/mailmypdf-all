// ─── SHARED FINDING TAXONOMY ─────────────────────────────────────────────
// Per the blueprint: reuse this taxonomy across ALL engines — due-process,
// discrepancy, investigation, records-production — so findings are uniform
// regardless of which engine produced them.

export type FindingType =
  | "MISSING_REQUESTED_CATEGORY"     // A requested records category was not produced
  | "REFERENCED_RECORD_NOT_PRODUCED" // A document referenced in the record was not actually produced
  | "IDENTIFIER_MISMATCH"            // Case/violation/parcel numbers don't match across documents
  | "DATE_GAP"                       // Unexplained gap in the timeline
  | "DUPLICATE_RECORD"              // Same record produced multiple times
  | "MISSING_ATTACHMENT"            // A document references an attachment that wasn't included
  | "UNEXPLAINED_REDACTION"          // Redaction without stated legal basis
  | "PARTIAL_PRODUCTION"             // Some but not all requested records produced
  | "UNRESPONSIVE_ITEM"              // Produced record doesn't actually respond to the request
  | "PRODUCTION_AMBIGUITY"           // Cannot determine if a requested item was produced
  // Due-process specific (mapped into the same taxonomy)
  | "NOTICE_TIMING_VIOLATION"        // Insufficient notice period before action
  | "NO_PRIOR_NOTICE"                // Adverse action taken without any prior notice
  | "HEARING_RIGHT_VIOLATION"        // Adverse action without hearing opportunity
  | "APPEAL_PATHWAY_MISSING"         // Decision doesn't mention appeal rights
  | "FACIAL_DEFECT"                  // Notice has a defect on its face (wrong code, missing deadline)
  | "CONTRADICTION"                  // Evidence contradicts another piece of evidence
  | "JURISDICTION_ERROR"             // Authority cited doesn't match the property's jurisdiction
  ;

export type FindingSeverity = "critical" | "high" | "medium" | "low" | "info";
export type FindingConfidence = "high" | "medium" | "low";

export interface UnifiedFinding {
  id: string;
  type: FindingType;
  severity: FindingSeverity;
  statement: string;
  supportingFacts: string[];
  confidence: FindingConfidence;
  recommendedAction: string;
  source: "due-process" | "discrepancy" | "investigation" | "records" | "jurisdiction";
  unresolved: boolean;
  evidenceIds?: string[];
  analysisRule?: string;
}

let findingSeq = 0;
export function createFinding(params: {
  type: FindingType;
  severity: FindingSeverity;
  statement: string;
  supportingFacts: string[];
  confidence: FindingConfidence;
  recommendedAction: string;
  source: UnifiedFinding["source"];
  evidenceIds?: string[];
  analysisRule?: string;
  unresolved?: boolean;
}): UnifiedFinding {
  if (params.supportingFacts.length === 0) {
    throw new Error("Finding requires at least one supporting fact");
  }
  return {
    id: `finding-${++findingSeq}-${Date.now()}`,
    type: params.type,
    severity: params.severity,
    statement: params.statement,
    supportingFacts: params.supportingFacts,
    confidence: params.confidence,
    recommendedAction: params.recommendedAction,
    source: params.source,
    unresolved: params.unresolved ?? true,
    evidenceIds: params.evidenceIds,
    analysisRule: params.analysisRule,
  };
}

export function findingSummary(findings: UnifiedFinding[]) {
  return {
    total: findings.length,
    critical: findings.filter((f) => f.severity === "critical").length,
    high: findings.filter((f) => f.severity === "high").length,
    medium: findings.filter((f) => f.severity === "medium").length,
    low: findings.filter((f) => f.severity === "low").length,
    info: findings.filter((f) => f.severity === "info").length,
    unresolved: findings.filter((f) => f.unresolved).length,
  };
}

export function resolveFinding(finding: UnifiedFinding): UnifiedFinding {
  return { ...finding, unresolved: false };
}
