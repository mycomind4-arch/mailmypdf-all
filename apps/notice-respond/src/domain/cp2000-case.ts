/* ═══════════════════════════════════════════════════════════
   CP2000 CASE MODEL — the typed, versionable structure that
   connects all CP2000 analysis components.

   CP2000Case
   ├── notice
   ├── taxpayer
   ├── taxYear
   ├── deadlines
   ├── reportedIncome
   ├── proposedIncome
   ├── discrepancies
   ├── taxImpact
   ├── evidence
   ├── research
   ├── responseStrategy
   ├── draft
   ├── validation
   └── submission

   ═══════════════════════════════════════════════════════════ */

import type { CP2000Extraction } from "./cp2000";
import type { NoticeFact } from "./fact";
import type { Deadline } from "./deadline";
import type { Finding } from "./cp2000-findings";
import type { Discrepancy } from "./cp2000-discrepancy";
import type { EvidenceChecklistItem } from "./cp2000-evidence";
import type { SourceCitation, IRSSource } from "./cp2000-research";
import type { ResponseDraft } from "./response";

// ── Case State ───────────────────────────────────────────────

export type CasePhase =
  | "intake"
  | "classification"
  | "extraction"
  | "analysis"
  | "evidence_review"
  | "strategy"
  | "drafting"
  | "validation"
  | "user_review"
  | "approved"
  | "mailing"
  | "submitted"
  | "complete";

export type CaseMaturity = "discovery" | "functional" | "authority";

// ── Response Strategy ────────────────────────────────────────

export type StrategyPosition =
  | "agree_all"
  | "disagree_some"
  | "disagree_all"
  | "insufficient_info"
  | "needs_professional_review";

export interface CP2000ResponseStrategy {
  position: StrategyPosition;
  issues: string[];
  evidenceToInclude: string[];
  explanations: string[];
  corrections: string[];
  unresolvedIssues: string[];
  requestedActions: string[];
  supportingSources: string[];
  riskFlags: string[];
  confidence: "high" | "medium" | "low";
}

// ── Validation Result ────────────────────────────────────────

export interface CP2000ValidationFinding {
  check: string;
  passed: boolean;
  detail: string;
  severity: "error" | "warning" | "info" | "block";
  validator: "factual" | "requirement";
}

export interface CP2000ValidationResult {
  factualFindings: CP2000ValidationFinding[];
  requirementFindings: CP2000ValidationFinding[];
  allFindings: CP2000ValidationFinding[];
  passed: boolean;
  errors: number;
  warnings: number;
  blocks: number;
  blocked: boolean;
}

// ── CP2000 Case ──────────────────────────────────────────────

export interface CP2000Case {
  id: string;
  version: number;
  phase: CasePhase;
  maturity: CaseMaturity;

  // ── From extraction ──
  notice: {
    extraction: CP2000Extraction;
    facts: NoticeFact[];
  };

  // ── Deadline ──
  deadline: {
    raw: string | null;
    parsed: string | null;
    certainty: "confirmed" | "derived" | "uncertain" | "missing";
    source: string;
  };

  // ── Discrepancies ──
  discrepancies: Discrepancy[];

  // ── Findings ──
  findings: Finding[];

  // ── Evidence ──
  evidence: EvidenceChecklistItem[];

  // ── Research ──
  research: {
    sources: IRSSource[];
    knownFacts: SourceCitation[];
  };

  // ── Strategy ──
  strategy: CP2000ResponseStrategy | null;

  // ── Draft ──
  draft: ResponseDraft | null;

  // ── Validation ──
  validation: CP2000ValidationResult | null;

  // ── User facts ──
  userFacts: string | null;
  userObjective: string | null;

  // ── Submission ──
  submission: {
    status: "not_started" | "preparing" | "mailed" | "failed";
    method: string | null;
    trackingNumber: string | null;
    proofUrl: string | null;
  };

  // ── Metadata ──
  createdAt: string;
  updatedAt: string;
}

// ── Factory ──────────────────────────────────────────────────

export function createCP2000Case(extraction: CP2000Extraction): CP2000Case {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    version: 1,
    phase: "extraction",
    maturity: "functional",
    notice: {
      extraction,
      facts: extraction.facts,
    },
    deadline: {
      raw: extraction.responseDeadline,
      parsed: extraction.responseDeadline,
      certainty: extraction.responseDeadline ? "confirmed" : "missing",
      source: extraction.responseDeadline
        ? "Extracted from notice text"
        : "Not found in notice",
    },
    discrepancies: [],
    findings: [],
    evidence: [],
    research: {
      sources: [],
      knownFacts: [],
    },
    strategy: null,
    draft: null,
    validation: null,
    userFacts: null,
    userObjective: null,
    submission: {
      status: "not_started",
      method: null,
      trackingNumber: null,
      proofUrl: null,
    },
    createdAt: now,
    updatedAt: now,
  };
}

// ── Case Updates ─────────────────────────────────────────────

export function setCaseAnalysis(
  case_: CP2000Case,
  analysis: {
    discrepancies: Discrepancy[];
    findings: Finding[];
    evidence: EvidenceChecklistItem[];
  },
): CP2000Case {
  return {
    ...case_,
    phase: "analysis",
    discrepancies: analysis.discrepancies,
    findings: analysis.findings,
    evidence: analysis.evidence,
    updatedAt: new Date().toISOString(),
  };
}

export function setCaseStrategy(
  case_: CP2000Case,
  strategy: CP2000ResponseStrategy,
): CP2000Case {
  return {
    ...case_,
    phase: "strategy",
    strategy,
    updatedAt: new Date().toISOString(),
  };
}

export function setCaseDraft(
  case_: CP2000Case,
  draft: ResponseDraft,
): CP2000Case {
  return {
    ...case_,
    phase: "drafting",
    draft,
    updatedAt: new Date().toISOString(),
  };
}

export function setCaseValidation(
  case_: CP2000Case,
  validation: CP2000ValidationResult,
): CP2000Case {
  return {
    ...case_,
    phase: "validation",
    validation,
    updatedAt: new Date().toISOString(),
  };
}

export function setCaseUserReview(
  case_: CP2000Case,
  approved: boolean,
): CP2000Case {
  return {
    ...case_,
    phase: approved ? "approved" : "validation",
    updatedAt: new Date().toISOString(),
  };
}

export function setCaseSubmission(
  case_: CP2000Case,
  submission: Partial<CP2000Case["submission"]>,
): CP2000Case {
  return {
    ...case_,
    phase: submission.status === "mailed" ? "submitted" : "mailing",
    submission: { ...case_.submission, ...submission },
    updatedAt: new Date().toISOString(),
  };
}

export function setCaseResearch(
  case_: CP2000Case,
  research: {
    sources: IRSSource[];
    knownFacts: SourceCitation[];
  },
): CP2000Case {
  return {
    ...case_,
    phase: "analysis",
    research,
    updatedAt: new Date().toISOString(),
  };
}

export function setCaseUserInput(
  case_: CP2000Case,
  userFacts: string | null,
  userObjective: string | null,
): CP2000Case {
  return {
    ...case_,
    userFacts,
    userObjective,
    updatedAt: new Date().toISOString(),
  };
}
